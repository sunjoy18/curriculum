function doGet() {
  const SHEET_NAME = "Curriculum";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    return json({ error: "Sheet '" + SHEET_NAME + "' not found." });
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return json([]);
  }

  const headers = values.shift().map(String);

  const data = values
    .filter(row => row.some(cell => String(cell).trim() !== ""))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header.trim()] = row[index] ?? "";
      });
      return item;
    });

  return json(data);
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}