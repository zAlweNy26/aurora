import { OAuth2Client } from 'oslo/oauth2'
import { Agent } from 'node:https'
import {
  createHash,
  randomUUID,
  type BinaryLike,
  createSign,
  X509Certificate,
  createPrivateKey,
  KeyObject,
} from 'node:crypto'
import { ofetch } from 'ofetch'
import type { FetchOptions, MappedResponseType, ResponseType } from 'ofetch'
import { createDate, TimeSpan } from 'oslo'
import { SIGNED_HEADERS } from './types.js'
import type { ConsentStatus, PSD2ClientOptions, PSD2Scope, ScaStatus } from './types.js'

export class PSD2Client {
  #client: OAuth2Client
  #identifier: string
  #certificate: string
  #key: KeyObject

  constructor(private options: PSD2ClientOptions) {
    const { clientId, baseURL, certificate, certificateKey, redirectURI } = options

    const signingX509 = new X509Certificate(Buffer.from(certificate, 'hex'))
    const signingPriv = createPrivateKey(Buffer.from(certificateKey, 'hex'))
    if (signingX509.checkPrivateKey(signingPriv)) {
      this.#identifier = `SN=${signingX509.serialNumber},CA=${signingX509.issuer.split('\n').join(',')}`
      this.#certificate = signingX509.raw.toString('base64')
      this.#key = signingPriv
    } else throw new Error(`Signing key doesn't match signing certificate.`)

    this.#client = new OAuth2Client(clientId, `${baseURL}/authorise`, `${baseURL}/token`, {
      redirectURI,
    })
  }

  async createAuthorizationURL(state: string, codeVerifier: string, scopes: PSD2Scope[]): Promise<URL> {
    return await this.#client.createAuthorizationURL({
      codeChallengeMethod: 'S256',
      scopes: [...scopes, 'offline_access'],
      codeVerifier,
      state,
    })
  }

  async validateAuthorizationCode(code: string, codeVerifier: string) {
    const result = await this.#client.validateAuthorizationCode(code, {
      authenticateWith: 'http_basic_auth',
      credentials: this.options.clientSecret,
      codeVerifier,
    })
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token ?? null,
      accessTokenExpiresAt: createDate(new TimeSpan(result.expires_in ?? 0, 's')),
      scope: result.scope,
    }
  }

  async refreshAccessToken(token: string, scopes: PSD2Scope[]) {
    const result = await this.#client.refreshAccessToken(token, {
      authenticateWith: 'http_basic_auth',
      credentials: this.options.clientSecret,
      scopes: [...scopes, 'offline_access'],
    })
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token ?? null,
      accessTokenExpiresAt: createDate(new TimeSpan(result.expires_in ?? 0, 's')),
      scope: result.scope,
    }
  }

  private calculateDigest(body: BinaryLike) {
    const hash = createHash('sha256')
    hash.update(body)
    hash.end()
    const digest = hash.digest('base64')

    return {
      Digest: `SHA-256=${digest}`,
    }
  }

  private calculateSignature(headers: Record<string, any>) {
    const headersToSign = Object.keys(headers).filter((key) => SIGNED_HEADERS.includes(key.toLowerCase()))
    const headersString = headersToSign.sort().join(' ').toLowerCase()
    const signingString = headersToSign
      .map((key) => `${key.toLowerCase()}: ${headers[key]}`)
      .sort()
      .join('\n')

    const sign = createSign('RSA-SHA256')
    sign.update(signingString)
    sign.end()
    const signature = sign.sign(this.#key, 'base64')

    return {
      'TPP-Signature-Certificate': this.#certificate,
      Signature: `keyId="${this.#identifier}",algorithm="sha-256",headers="${headersString}",signature="${signature}"`,
    }
  }

  async createConsent(validUntil: TimeSpan, frequencyPerDay = 1) {
    const consent = await this.fetch<{
      consentStatus: ConsentStatus
      consentId: string
    }>('/consents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        access: {
          accounts: [],
          balances: [],
          transactions: [],
        },
        recurringIndicator: true,
        validUntil: createDate(validUntil).toISOString(),
        frequencyPerDay,
      },
    })

    const authorise = await this.fetch<{
      scaStatus: ScaStatus
      authorisationId: string
    }>(`/consents/${consent.consentId}/authorisations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return {
      consentId: consent.consentId,
      consentStatus: consent.consentStatus,
      authorisationId: authorise.authorisationId,
      scaStatus: authorise.scaStatus,
    }
  }

  async checkConsent(consentId: string) {
    return (await this.fetch<{ consentStatus: ConsentStatus }>(`/consents${consentId}/status`)).consentStatus
  }

  async checkSCA(consentId: string, authorisationId: string) {
    return (await this.fetch<{ scaStatus: ScaStatus }>(`/consents/${consentId}/authorisations/${authorisationId}`))
      .scaStatus
  }

  async fetch<T, R extends ResponseType = 'json'>(
    path: string,
    options?: Omit<FetchOptions, 'baseURL' | 'agent'> & {
      headers?: Record<string, any>
    },
  ): Promise<MappedResponseType<R, T>> {
    const { body, headers } = options ?? {}

    const baseHeaders = {
      'X-Request-Id': randomUUID(),
      Accept: 'application/json',
      ...headers,
      ...this.calculateDigest(body ? JSON.stringify(body) : Buffer.from('', 'hex')),
    }

    return await ofetch<T, R>(path, {
      baseURL: `${this.options.baseURL}/v1`,
      agent: new Agent({
        cert: this.options.sslCertificate,
        key: this.options.sslKey,
      }),
      headers: {
        ...baseHeaders,
        ...this.calculateSignature(baseHeaders),
      },
      body,
    })
  }
}
