export interface PSD2ClientOptions {
    baseURL: string
    clientId: string
    clientSecret: string
    certificate: string
    certificateKey: string
    redirectURI: string
    sslCertificate?: string
    sslKey?: string
}

export type PSD2Scope = `PIS:${string}` | `AIS:${string}` | `PIIS:${string}`

export type ConsentStatus = 'received' | 'rejected' | 'valid' | 'revokedByPsu' | 'expired' | 'terminatedByTpp' | 'partiallyAuthorised'

export type ScaStatus = 'received' | 'psuIdentified' | 'psuAuthenticated' | 'scaMethodSelected' | 'started' | 'unconfirmed' | 'finalised' | 'failed' | 'exempted'

export const SIGNED_HEADERS = ['digest', 'x-request-id', 'psu-id', 'psu-corporate-id', 'tpp-redirect-uri']