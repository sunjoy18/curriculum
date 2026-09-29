# Developer Engineering Curriculum Tracker

Static GitHub Pages tracker for the personal developer curriculum.

## Google Sheets backend

Create a Google Sheet with a tab named Curriculum and these columns:

ID | Phase | Week | Module | Topic | Outcome | Hours | Level | Resources

In Extensions -> Apps Script, add:

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Curriculum");
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const data = values.map(row => Object.fromEntries(headers.map((h,i) => [h,row[i]])));
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

Deploy -> New deployment -> Web app.
Execute as: Me.
Who has access: Anyone.

Copy the deployment /exec URL into config.js:

window.CURRICULUM_API_URL = "YOUR_APPS_SCRIPT_EXEC_URL";

Commit config.js. The app will load the Sheet at runtime.

## Progress

Learning progress is stored in browser localStorage. Use Export Progress for a JSON backup.

Never put GitHub tokens, Google service-account keys, or other secrets in frontend files.

## GitHub Pages

Repository: https://github.com/sunjoy18/curriculum
