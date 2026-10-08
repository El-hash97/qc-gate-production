/** @type {import('next').NextConfig} */
const nextConfig = {
  // @sparticuz/chromium ships a native/compressed Chromium binary — Next.js's
  // webpack bundler mishandles that, so it must be loaded via plain Node
  // `require` instead (see lib/pdfBrowser.ts, this app's server-rendered
  // PDF export).
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium'],
    // Externalizing alone isn't enough on Vercel: its file-tracer only
    // deploys referenced .js files, so the package's bin/*.br binaries
    // (resolved via a relative path at runtime, never statically imported)
    // are missing in production — executablePath() then throws
    // 'The input directory "/var/task/node_modules/@sparticuz/chromium/bin"
    // does not exist'. Force-include them in both PDF functions' bundles.
    outputFileTracingIncludes: {
      '/api/dashboard/pdf': ['./node_modules/@sparticuz/chromium/bin/**/*'],
      '/api/history/[id]/pdf': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    },
  },
};

export default nextConfig;
