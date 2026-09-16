/// <reference path="../.astro/types.d.ts" />
/// <reference path="../worker-configuration.d.ts" />

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
  export function waitUntil(promise: Promise<unknown>): void;
  const _default: { env: Cloudflare.Env };
  export default _default;
}
