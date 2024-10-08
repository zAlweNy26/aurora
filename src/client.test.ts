import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PSD2Client } from './client.js'
import { OAuth2Client } from 'oslo/oauth2'
import crypto from 'node:crypto'
import { createDate, TimeSpan } from 'oslo'

vi.mock('oslo/oauth2')
vi.mock('node:crypto')
vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}))

describe('PSD2Client', () => {
  let client: PSD2Client
  const options = {
    clientId: 'test-client-id',
    baseURL: 'https://api.test.com',
    certificate: 'test-certificate',
    certificateKey: 'test-certificate-key',
    redirectURI: 'https://redirect.test.com',
    clientSecret: 'test-client-secret',
    sslCertificate: 'test-ssl-certificate',
    sslKey: 'test-ssl-key',
  }

  beforeEach(() => {
    const mockX509Certificate = {
      serialNumber: '123456',
      issuer: 'CN=Test CA',
      raw: Buffer.from('test-raw'),
      checkPrivateKey: vi.fn().mockReturnValue(true),
    }
    const mockPrivateKey = crypto.createPrivateKey(Buffer.from('test-private-key'))

    vi.spyOn(crypto, 'X509Certificate', 'get').mockReturnValue(mockX509Certificate as any)
    vi.spyOn(crypto, 'createPrivateKey').mockReturnValue(mockPrivateKey as any)

    client = new PSD2Client(options)
  })

  it('should create an instance of PSD2Client', () => {
    expect(client).toBeInstanceOf(PSD2Client)
  })

  it('should create an authorization URL', async () => {
    const mockCreateAuthorizationURL = vi.fn().mockResolvedValue(new URL('https://auth.test.com'))
    OAuth2Client.prototype.createAuthorizationURL = mockCreateAuthorizationURL

    const url = await client.createAuthorizationURL('test-state', 'test-code-verifier', ['PIS:scope1', 'PIS:scope2'])
    expect(url).toEqual(new URL('https://auth.test.com'))
    expect(mockCreateAuthorizationURL).toHaveBeenCalledWith({
      codeChallengeMethod: 'S256',
      scopes: ['PIS:scope1', 'PIS:scope2', 'offline_access'],
      codeVerifier: 'test-code-verifier',
      state: 'test-state',
    })
  })

  it('should validate authorization code', async () => {
    const mockValidateAuthorizationCode = vi.fn().mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      scope: 'test-scope',
    })
    OAuth2Client.prototype.validateAuthorizationCode = mockValidateAuthorizationCode

    const result = await client.validateAuthorizationCode('test-code', 'test-code-verifier')
    expect(result).toEqual({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      accessTokenExpiresAt: createDate(new TimeSpan(3600, 's')),
      scope: 'test-scope',
    })
    expect(mockValidateAuthorizationCode).toHaveBeenCalledWith('test-code', {
      authenticateWith: 'http_basic_auth',
      credentials: options.clientSecret,
      codeVerifier: 'test-code-verifier',
    })
  })

  it('should refresh access token', async () => {
    const mockRefreshAccessToken = vi.fn().mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      scope: 'test-scope',
    })
    OAuth2Client.prototype.refreshAccessToken = mockRefreshAccessToken

    const result = await client.refreshAccessToken('test-token', ['PIS:scope1', 'PIS:scope2'])
    expect(result).toEqual({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      accessTokenExpiresAt: createDate(new TimeSpan(3600, 's')),
      scope: 'test-scope',
    })
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('test-token', {
      authenticateWith: 'http_basic_auth',
      credentials: options.clientSecret,
      scopes: ['PIS:scope1', 'PIS:scope2', 'offline_access'],
    })
  })
})
