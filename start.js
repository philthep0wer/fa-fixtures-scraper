const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

async function scrapeFixtures(label, url) {
  const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/bin/chromium' // Use the system-installed Chromium
});
  const page = await browser.newPage();

  try {
    console.log(`Scraping ${label}...`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("table", { timeout: 15000 });

    const rows = await page.$$eval("table tr", trs => trs.map(tr =>
      Array.from(tr.querySelectorAll("td, th")).map(td => td.innerText.trim())
    ));

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const filePath = path.join(outputDir, `${label}_fixtures.csv`);
    const csvContent = rows.map(row => row.join(",")).join("\n");

    fs.writeFileSync(filePath, csvContent);

    console.log(`Saved CSV to ${filePath}`);
  } catch (err) {
    console.error(`Error scraping ${label}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function runAll() {
  for (const fixture of config.fixtures) {
    await scrapeFixtures(fixture.label, fixture.url);
  }
}

runAll();
