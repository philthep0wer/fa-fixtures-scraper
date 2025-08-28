const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { google } = require("googleapis");
const config = require("./config.json");
const { executablePath } = require("puppeteer");

const auth = new google.auth.GoogleAuth({
  keyFile: "ft-sheets-integration-d2872325146d.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheetsClient() {
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

async function updateLeagueSheet(spreadsheetId, sheetName, rows) {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'!A1:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: "RAW",
    resource: { values: rows },
  });

  console.log(`📊 Updated worksheet: ${sheetName}`);
}

async function updateLastUpdatedTimestamp(spreadsheetId, label) {
  const sheets = await getSheetsClient();
  const timestamp = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Summary!A1:B1`,
    valueInputOption: "RAW",
    resource: { values: [[label, timestamp]] },
  });

  console.log(`🕒 Timestamp updated for ${label}`);
}

async function scrapeLeague({ label, url }) {
  console.log(`Scraping ${label}...`);
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--user-data-dir=fulltime-session'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    const screenshotPath = path.join(__dirname, "output", `${label}_debug.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

    console.log(`⏳ Waiting 30 seconds to allow manual Recaptcha solve...`);
    await new Promise(resolve => setTimeout(resolve, 30000));

    let rows = [];

    if (label.toLowerCase().includes("results")) {
      try {
        await page.waitForSelector('div.results-table-2 div.tbody div[id^="fixture-"]', { timeout: 10000 });
        rows = await page.$$eval('div.results-table-2 div.tbody div[id^="fixture-"]', allRows => {
          return allRows.map(row => {
            const cols = row.querySelectorAll('div');
            return Array.from(cols).map(col => col.innerText.trim()).filter(Boolean);
          });
        });
      } catch (err) {
        console.warn(`⚠️ Table not found for ${label}, retrying after delay...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        throw err;
      }
    } else {
      try {
        await page.waitForSelector(".tableWrapper table", { timeout: 10000 });
        rows = await page.$$eval(".tableWrapper table tbody tr", trs => {
          return trs.map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim()));
        });
      } catch (err) {
        console.warn(`⚠️ Table not found for ${label}, retrying after delay...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        throw err;
      }
    }

    if (!rows.length) throw new Error("No data extracted from table");

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const csvPath = path.join(__dirname, "output", `${label}_fixtures.csv`);
    fs.writeFileSync(csvPath, csvContent);
    console.log(`📄 Saved CSV to ${csvPath}`);

    const spreadsheetId = config.spreadsheetId;
    await updateLeagueSheet(spreadsheetId, label, rows);
    await updateLastUpdatedTimestamp(spreadsheetId, label);
  } catch (err) {
    console.error(`❌ Error scraping ${label}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function runAll() {
  for (const league of config.fixtures) {
    await scrapeLeague(league);
  }
  console.log("🏁 All scraping complete.");
}

runAll();
