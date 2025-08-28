import { Actor } from 'apify';
import puppeteer from 'puppeteer';

Actor.main(async () => {
    const browser = await puppeteer.launch({
        headless: true,   // "true" is required for Apify cloud
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const url = 'https://philbrisjrs.wixsite.com/my-site-29128/ft-snippets';
    Actor.log.info(`🌐 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Screenshot before wait
    const beforeScreenshot = await page.screenshot({ type: 'png', fullPage: true });
    await Actor.setValue('BEFORE_WAIT', beforeScreenshot, { contentType: 'image/png' });

    // Wait for iframe to load (FT snippet is inside iframe)
    Actor.log.info('🕰️ Waiting for iframe to load...');
    await page.waitForSelector('iframe', { timeout: 30000 });

    // Screenshot after iframe appears
    const afterScreenshot = await page.screenshot({ type: 'png', fullPage: true });
    await Actor.setValue('AFTER_WAIT', afterScreenshot, { contentType: 'image/png' });

    Actor.log.info('✅ Done — screenshots saved to key-value store.');

    await browser.close();
});
