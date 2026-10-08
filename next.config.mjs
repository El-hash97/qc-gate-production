/** @type {import('next').NextConfig} */
const nextConfig = {
  // @sparticuz/chromium ships a native/compressed Chromium binary — Next.js's
  // webpack bundler mishandles that, so it must be loaded via plain Node
  // `require` instead (see lib/pdfBrowser.ts, this app's server-rendered
  // PDF export).
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium'],
  },
};

export default nextConfig;
