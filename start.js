const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

async function scrapeFixtures(label, url) {
const browser = await puppeteer.launch({
  headless: 'new', // Best for v24+
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

  const page = await browser.newPage();

  try {
    console.log(`Scraping ${label}...`);

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

// Optional wait fallback in case table takes time to render 
await new Promise(resolve => setTimeout(resolve, 5000));

await page.screenshot({
  path: path.join(__dirname, "output", `${label}_debug.png`),
  fullPage: true
});


    await page.waitForSelector("table", { timeout: 30000 });

    const rows = await page.$$eval("table tr", trs => trs.map(tr =>
      Array.from(tr.querySelectorAll("td, th")).map(td => td.innerText.trim())
    ));


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

runAll().then(() => {
  console.log("✅ All scraping complete.");
  process.exit(0);
}).catch((err) => {
  console.error("❌ Error during scraping:", err);
  process.exit(1);
});