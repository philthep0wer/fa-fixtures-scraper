const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const keyPath = path.resolve(__dirname, 'service-account.json');
const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

async function writeTestRow() {
  try {
    const authClient = new google.auth.GoogleAuth({
      credentials: keys,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const auth = await authClient.getClient();

    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.update({
      spreadsheetId: '1OclBZZ8eNTFI-RWXU8zDTcEFymTHPkcxraLx-lmOnRQ',
      range: 'Fixtures!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['✅ Auth Fix via GoogleAuth', new Date().toISOString()]],
      },
    });

    console.log('✅ Sheets write successful:', res.statusText);
  } catch (err) {
    console.error('❌ Sheets API error:', err.message);
    if (err.response?.data?.error) {
      console.error(JSON.stringify(err.response.data.error, null, 2));
    }
  }
}

writeTestRow();
