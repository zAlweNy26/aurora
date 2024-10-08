# Aurora

Aurora is a PSD2 auth-related library for JavaScript/TypeScript. It's light weight, fully-typed, and runtime-agnostic[*](#issues).

## Installation

```bash
npm i @danyalwe/aurora
bun i @danyalwe/aurora
```

### Polyfill

If you're using Node.js 18 and below, you'll need to polyfill the Web Crypto API. This is not required in Node.js 20, Bun, Deno, and Cloudflare Workers.

```ts
import { webcrypto } from "node:crypto"

globalThis.crypto = webcrypto as Crypto
```

### Issues

- [ ] Bun runtime support (caused by _**X509Certificate**_).

## Credits

- [Arctic](https://github.com/pilcrowOnPaper/arctic) for the structure style.
- [Oslo](https://github.com/pilcrowonpaper/oslo) for the OAuth2 helpers.
