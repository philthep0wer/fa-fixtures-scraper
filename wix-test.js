const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1ZimwDM5JLzcCc7Fk-XDlftOJj7DoNeMBMHPg3XeDft8';
const SHEET_NAME = 'WixTest';

(async () => {
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  page.setDefaultNavigationTimeout(90000);

  try {
    console.log('🌍 Navigating to Wix page...');
    await page.goto('https://philbrisjrs.wixsite.com/my-site-29128/ft-snippets', {
      waitUntil: 'domcontentloaded'
    });

    console.log('⏳ Waiting for iframe...');
    const iframeElementHandle = await page.waitForSelector('iframe', { timeout: 30000 });

    const frame = await iframeElementHandle.contentFrame();

    if (!frame) throw new Error('❌ Could not get iframe content');

    // 📸 Take screenshot of full page before proceeding
    console.log('📸 Taking screenshot of Wix page...');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
const base64Image = screenshotBuffer.toString('base64');

console.log('📸 Screenshot taken (base64):');
console.log(`data:image/png;base64,${base64Image}`);


    console.log('⏳ Waiting for fixture table in iframe...');
    await frame.waitForFunction(() => {
      return [...document.querySelectorAll('table')].some(
        table =>
          table.innerText.includes('League') ||
          table.innerText.includes('Fixture')
      );
    }, { timeout: 60000 });

    console.log('📋 Extracting table data from iframe...');
    const values = await frame.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return [];

      return Array.from(table.querySelectorAll('tr')).map(row =>
        Array.from(row.querySelectorAll('th, td')).map(cell =>
          cell.innerText.trim()
        )
      );
    });

    console.log('📤 Writing to Google Sheet...');
    await writeToGoogleSheet(values);
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error during scraping or writing:', error);
  } finally {
    await browser.close();
  }
})();

async function writeToGoogleSheet(values) {
  const keyPath = path.resolve(__dirname, 'service-account.json');
  const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: keys,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}
