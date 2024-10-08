# Aurora

Aurora is a PSD2 auth-related library for JavaScript/TypeScript. It's light weight, fully-typed, and runtime-agnostic[\*](#issues).

The library is based on the [_Berlin Group_](https://www.berlin-group.org/)'s standard "[NextGenPSD2](https://www.berlin-group.org/psd2-access-to-bank-accounts)", used to communicate with European Banks since the release of the standard [**PSD2**](https://en.wikipedia.org/wiki/Payment_Services_Directive) (Revised Payment Services Directive).

The service is meant to be deployed beside other services which need access to bank accounts.

## Installation

```bash
# Node:
npm i @danyalwe/aurora
# Bun:
bun i @danyalwe/aurora
```

### Polyfill

If you're using Node.js 18 and below, you'll need to polyfill the Web Crypto API. This is not required in Node.js 20, Bun, Deno, and Cloudflare Workers.

```ts
import { webcrypto } from 'node:crypto'

globalThis.crypto = webcrypto as Crypto
```

### Issues

- [ ] Bun runtime support (caused by _**X509Certificate**_).

## Credits

- [Arctic](https://github.com/pilcrowOnPaper/arctic) for the structure style.
- [Oslo](https://github.com/pilcrowonpaper/oslo) for the OAuth2 helpers.
