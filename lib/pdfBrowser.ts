// Headless Chromium launcher for the server-rendered PDF exports
// (app/api/history/[id]/pdf and app/api/dashboard/pdf).
//
// Kept in one place so the two routes can't drift apart: the serverless
// launch flags must follow @sparticuz/chromium's documented pattern for the
// installed major (see its README's puppeteer-core snippet). Notably the
// binary is a headless-shell build — the old headless mode (`headless: true`)
// was removed from Chromium itself, so launching with `headless: true` fails
// on Vercel/Lambda while still working locally (where the full `puppeteer`
// package's real Chrome below is used instead).

// Vercel and AWS Lambda both set one of these for a running function; a
// plain `next dev` / `next start` on a normal machine sets neither.
function isServerlessEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function launchPdfBrowser() {
  if (!isServerlessEnvironment()) {
    // Local dev: the full `puppeteer` package (devDependency) bundles its
    // own matching Chromium, so this doesn't depend on the developer having
    // a browser installed at some specific path.
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({ headless: true });
  }
  // Production (Vercel): puppeteer-core has no bundled browser — paired here
  // with @sparticuz/chromium, a Chromium build sized to fit a serverless
  // function's deployment limits (see next.config.mjs's
  // serverComponentsExternalPackages, which keeps webpack from mangling it).
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ]);
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  });
}
