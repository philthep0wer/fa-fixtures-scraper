const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// === CONFIG ===
const SPREADSHEET_ID = '1OclBZZ8eNTFI-RWXU8zDTcEFymTHPkcxraLx-lmOnRQ';
const SHEET_NAME = 'Fixtures';
const TARGET_URL = 'https://philbrisjrs.wixsite.com/my-site-29128/ft-snippets';

// ✅ Sheets writer function (inline)
async function writeToGoogleSheet(values) {
  const keyPath = path.resolve(__dirname, 'service-account.json');
  const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

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

  // Write new data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

// ✅ Main scraping logic
(async () => {
  console.log('🌐 Navigating to Wix page...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  console.log('⏳ Waiting for fixture table to load...');
  await page.waitForFunction(() => {
    const table = document.querySelector('table');
    return table && table.querySelectorAll('tr').length > 5;
  }, { timeout: 60000 });

  // ✅ Scrape & transform
  const rawRows = await page.$$eval('table tr', rows =>
    rows.map(row => Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText.trim()))
  );

  // ✅ Merge date + fixture rows (every pair of rows)
  const fixtures = [];
  for (let i = 0; i < rawRows.length - 1; i++) {
    const rowA = rawRows[i];
    const rowB = rawRows[i + 1];

    if (
      rowA.length === 1 &&
      rowB.length > 1 &&
      !['League', 'Fixture List'].includes(rowA[0]) &&
      !rowB.includes('League')
    ) {
      fixtures.push([rowA[0], ...rowB]);
      i++; // Skip the next row (already merged)
    }
  }

  await browser.close();

  // ✅ Write to sheet
  console.log('📤 Writing to Google Sheet...');
  try {
    await writeToGoogleSheet([['Date', 'Fixture', 'Home', 'Away', 'Venue'], ...fixtures]);
    console.log('✅ Success: Fixtures written to sheet!');
  } catch (err) {
    console.error('❌ Error during sheet write:', err.message);
  }
})();
