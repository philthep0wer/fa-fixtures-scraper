const { google } = require("googleapis");
const fs = require("fs");

const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheetClient() {
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

async function updateLeagueSheet(spreadsheetId, leagueName, data) {
  const sheets = await getSheetClient();
  const range = `${leagueName}!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: data },
  });
}

async function updateLastUpdatedTimestamp(spreadsheetId, leagueName) {
  const sheets = await getSheetClient();
  const summarySheet = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Summary!A2:A100",
  });

  const rows = summarySheet.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === leagueName);

  if (rowIndex === -1) return;

  const cellRef = `Summary!B${rowIndex + 2}`;
  const timestamp = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellRef,
    valueInputOption: "RAW",
    requestBody: { values: [[timestamp]] },
  });
}

async function updateSheetForLeague(spreadsheetId, leagueName, data) {
  await updateLeagueSheet(spreadsheetId, leagueName, data);
  await updateLastUpdatedTimestamp(spreadsheetId, leagueName);
}

module.exports = {
  updateLeagueSheet,
  updateLastUpdatedTimestamp,
  updateSheetForLeague
};
