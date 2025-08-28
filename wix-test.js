const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const url = 'https://philbrisjrs.wixsite.com/my-site-29128/ft-snippets';
  console.log(`🌐 Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for a known element (like the FT SNIPPETS heading)
  await page.waitForSelector('h2', { timeout: 15000 });
  console.log('✅ Page loaded, simulating interaction...');

  // Simulate user interaction to encourage lazy-loading
  await page.mouse.move(200, 200);
  await page.mouse.move(400, 400);
  await page.mouse.wheel({ deltaY: 1000 });

  // Wait additional time to allow iframes/snippets to load
  await page.waitForTimeout(30000); // 30 seconds
  console.log('🕒 Finished waiting. Taking screenshot...');

  await page.screenshot({ path: 'rendered-page.png', fullPage: true });
  console.log('📸 Screenshot saved as rendered-page.png');

  await browser.close();
})();
