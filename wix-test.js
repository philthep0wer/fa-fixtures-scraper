const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const WIX_URL = 'https://philbrisjrs.wixsite.com/my-site-29128/ft-snippets';
const SPREADSHEET_ID = '1OclBZZ8eNTFI-RWXU8zDTcEFymTHPkcxraLx-lmOnRQ';
const SHEET_NAME = 'Fixtures';

// ✅ Inline Google Sheets writer
async function writeToGoogleSheet(values) {
  const keyPath = path.resolve(__dirname, 'service-account.json');
  const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: keys,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Clear the existing content
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

(async () => {
  console.log('🌐 Navigating to Wix page...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  });

  const page = await browser.newPage();
  await page.goto(WIX_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('⏳ Waiting for fixture table to load...');
  await page.waitForSelector('table'); // Simple selector for now

  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => cell.innerText.trim());
    });
  });

  await browser.close();

  // ✅ Merge date + fixture rows & exclude 'League' footer
  const mergedRows = [];
  for (let i = 0; i < data.length; i += 2) {
    const row1 = data[i];
    const row2 = data[i + 1];

    if (!row1 || !row2) continue;
    if (row1[0] === 'League' || row2[0] === 'League') continue;

    const date = row1[0];
    const rest = row2.slice(0, 5);
    mergedRows.push([date, ...rest]);
  }

  try {
    console.log('📤 Writing to Google Sheet...');
    await writeToGoogleSheet(mergedRows);
    console.log('✅ Successfully updated Google Sheet');
  } catch (err) {
    console.error('❌ Error during scraping or writing:', err.message);
  }
})();
