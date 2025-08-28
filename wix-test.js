const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1OclBZZ8eNTFI-RWXU8zDTcEFymTHPkcxraLx-lmOnRQ';
const SHEET_NAME = 'Fixtures';
const SELECTOR = '#lrep755262731 table';
const WIX_URL = 'https://philbrisjrs.wixsite.com/my-site-29128/ft-snippets';

// ✅ Sheets writer function (inline, not external)
async function writeToGoogleSheet(values) {
const keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials: keys,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Optional: Clear the sheet before writing
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  // Write the new data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    console.log('🌐 Navigating to Wix page...');
    await page.goto(WIX_URL, { waitUntil: 'networkidle2' });

    console.log('⏳ Waiting for fixture table to load...');
    const iframeEl = await page.waitForSelector('iframe');
    const frame = await iframeEl.contentFrame();
    await frame.waitForSelector(SELECTOR, { timeout: 15000 });

    const rawData = await frame.$$eval(SELECTOR + ' tr', rows =>
      rows.map(row => Array.from(row.cells, cell => cell.innerText.trim()))
    );

    // ✅ Collapse rows and remove junk
    const collapsedData = [];
    for (let i = 0; i < rawData.length - 1; i++) {
      const dateRow = rawData[i];
      const fixtureRow = rawData[i + 1];

      const date = dateRow[0]?.trim();
      const isValid =
        date &&
        date.toLowerCase() !== 'league' &&
        fixtureRow.length > 1 &&
        fixtureRow[1]?.toLowerCase() !== 'league';

      if (isValid) {
        collapsedData.push([date, ...fixtureRow.slice(1)]);
        i++; // Skip the next row (used already)
      }
    }

    if (collapsedData.length === 0) {
      throw new Error('⚠️ No valid fixture data found.');
    }

    console.log('📤 Writing to Google Sheet...');
    await writeToGoogleSheet(collapsedData);

    console.log('✅ Fixtures written successfully!');
  } catch (err) {
    console.error('❌ Error during scraping or writing:', err.message);
  } finally {
    await browser.close();
    process.exit(0); // ✅ Clean exit
  }
})();
