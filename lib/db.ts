import { neon } from '@neondatabase/serverless';

// API reference: https://neon.tech/docs/serverless/serverless-driver
//
// Lazily constructed: `next build` imports every Route Handler module during
// its "Collecting page data" step, before any request happens. Throwing here
// at module-import time (rather than on first actual query) would break
// `npm run build` in any environment where DATABASE_URL isn't set yet — so
// the check is deferred to the first real call.
let client: ReturnType<typeof neon> | null = null;

function getClient(): ReturnType<typeof neon> {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Copy .env.example to .env.local and fill in your Neon connection string.',
      );
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
  return getClient()(strings, ...values);
}
sqlTag.transaction = (...args: Parameters<ReturnType<typeof neon>['transaction']>) =>
  getClient().transaction(...(args as Parameters<ReturnType<typeof neon>['transaction']>));

export const sql = sqlTag as ReturnType<typeof neon>;
