const SHEET_NAME = "Cases";

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);

    sheet.appendRow([
      "id",
      "caseNum",
      "opened",
      "title",
      "classification",
      "type",
      "victim",
      "lastContact",
      "suspect",
      "notes",
      "closed",
      "closedDate",
      "closureNotes"
    ]);
  }

  return sheet;
}

// ─────────────────────────────
// GET (load all cases)
// ─────────────────────────────
function doGet() {
  return loadCases();
}

function loadCases() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return json({ cases: [] });
  }

  const headers = rows[0];

  const cases = rows.slice(1).map(row => {
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = row[i] === undefined ? "" : row[i];
    });

    return obj;
  });

  return json({ cases });
}

// ─────────────────────────────
// POST (save full dataset)
// ─────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!data.cases) {
      return json({ ok: false, error: "Missing cases array" });
    }

    saveCases(data.cases);

    return json({ ok: true });

  } catch (err) {
    return json({ ok: false, error: err.toString() });
  }
}

function saveCases(cases) {
  const sheet = getSheet();

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  cases.forEach(c => {
    sheet.appendRow([
      c.id || Utilities.getUuid(),
      c.caseNum || "",
      c.opened || "",
      c.title || "",
      c.classification || "",
      c.type || "",
      c.victim || "",
      c.lastContact || "",
      c.suspect || "",
      c.notes || "",
      c.closed || false,
      c.closedDate || "",
      c.closureNotes || ""
    ]);
  });
}

// ─────────────────────────────
// UTIL
// ─────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
