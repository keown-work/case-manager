# Code.gs for KSP Case Tracker

```javascript
/*
KSP Case Tracker Backend
Google Apps Script - Code.gs

SETUP:
1. Create a new Google Apps Script project.
2. Create an HTML file named "Index" and paste your HTML into it.
3. Replace localStorage logic in your HTML with google.script.run calls.
4. Paste this file into Code.gs.
5. Deploy as Web App.

OPTIONAL:
This backend stores all case data in Google Sheets instead of browser localStorage.
*/

const SHEET_NAME = 'Cases';
const CONTACT_SHEET = 'ContactLog';

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('KSP Case Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ───────────────────────────────────────────────────────
// INITIALIZE SHEETS
// ───────────────────────────────────────────────────────

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let caseSheet = ss.getSheetByName(SHEET_NAME);

  if (!caseSheet) {
    caseSheet = ss.insertSheet(SHEET_NAME);

    caseSheet.appendRow([
      'ID',
      'Case Number',
      'Opened Date',
      'Title',
      'Classification',
      'Type',
      'Victim',
      'Last Contact',
      'Suspect',
      'KYIBRS Transmit',
      'KYIBRS Accepted',
      'SAFE Notify',
      'SAFE Custody',
      'SAFE Lab',
      'Notes',
      'Advocate Consulted',
      'NICE Uploaded',
      'BWC Uploaded',
      'Volumized',
      'Closed',
      'Closed Date',
      'Closure Notes',
      'Created',
      'Updated'
    ]);

    caseSheet.getRange(1, 1, 1, 24).setFontWeight('bold');
    caseSheet.setFrozenRows(1);
  }

  let contactSheet = ss.getSheetByName(CONTACT_SHEET);

  if (!contactSheet) {
    contactSheet = ss.insertSheet(CONTACT_SHEET);

    contactSheet.appendRow([
      'Case ID',
      'Contact Date',
      'Method',
      'Notes',
      'Created'
    ]);

    contactSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    contactSheet.setFrozenRows(1);
  }

  return {
    success: true,
    message: 'Sheets initialized.'
  };
}

// ───────────────────────────────────────────────────────
// GET ALL CASES
// ───────────────────────────────────────────────────────

function getCases() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    initializeSheets();
    return [];
  }

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows
    .filter(row => row[0])
    .map(row => {
      const obj = {
        id: row[0],
        caseNum: row[1],
        opened: formatDateForClient(row[2]),
        title: row[3],
        classification: row[4],
        type: row[5],
        victim: row[6],
        lastContact: formatDateForClient(row[7]),
        suspect: row[8],
        kyibrsTransmit: formatDateForClient(row[9]),
        kyibrsAccepted: formatDateForClient(row[10]),
        safeNotify: formatDateForClient(row[11]),
        safeCustody: formatDateForClient(row[12]),
        safeLab: formatDateForClient(row[13]),
        notes: row[14],
        advocateConsulted: row[15] === true,
        niceUploaded: row[16] === true,
        bwcUploaded: row[17] === true,
        volumized: row[18] === true,
        closed: row[19] === true,
        closedDate: formatDateForClient(row[20]),
        closureNotes: row[21]
      };

      obj.contactLog = getContactLog(obj.id);

      return obj;
    });
}

// ───────────────────────────────────────────────────────
// SAVE CASE
// ───────────────────────────────────────────────────────

function saveCase(caseData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    initializeSheets();
  }

  const id = caseData.id || Utilities.getUuid();
  const now = new Date();

  const values = [
    id,
    caseData.caseNum || '',
    caseData.opened || '',
    caseData.title || '',
    caseData.classification || 'felony',
    caseData.type || 'standard',
    caseData.victim || '',
    caseData.lastContact || '',
    caseData.suspect || '',
    caseData.kyibrsTransmit || '',
    caseData.kyibrsAccepted || '',
    caseData.safeNotify || '',
    caseData.safeCustody || '',
    caseData.safeLab || '',
    caseData.notes || '',
    caseData.advocateConsulted || false,
    caseData.niceUploaded || false,
    caseData.bwcUploaded || false,
    caseData.volumized || false,
    caseData.closed || false,
    caseData.closedDate || '',
    caseData.closureNotes || '',
    caseData.created || now,
    now
  ];

  const data = sheet.getDataRange().getValues();

  let existingRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > -1) {
    sheet.getRange(existingRow, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return {
    success: true,
    id: id
  };
}

// ───────────────────────────────────────────────────────
// DELETE CASE
// ───────────────────────────────────────────────────────

function deleteCase(caseId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    return {
      success: false,
      message: 'Sheet not found.'
    };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === caseId) {
      sheet.deleteRow(i + 1);
    }
  }

  const contactSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTACT_SHEET);

  if (contactSheet) {
    const contactData = contactSheet.getDataRange().getValues();

    for (let i = contactData.length - 1; i >= 1; i--) {
      if (contactData[i][0] === caseId) {
        contactSheet.deleteRow(i + 1);
      }
    }
  }

  return {
    success: true
  };
}

// ───────────────────────────────────────────────────────
// CLOSE CASE
// ───────────────────────────────────────────────────────

function closeCase(caseId, closureNotes) {
  const cases = getCases();
  const target = cases.find(c => c.id === caseId);

  if (!target) {
    return {
      success: false,
      message: 'Case not found.'
    };
  }

  target.closed = true;
  target.closedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  target.closureNotes = closureNotes || '';

  saveCase(target);

  return {
    success: true
  };
}

// ───────────────────────────────────────────────────────
// REOPEN CASE
// ───────────────────────────────────────────────────────

function reopenCase(caseId) {
  const cases = getCases();
  const target = cases.find(c => c.id === caseId);

  if (!target) {
    return {
      success: false,
      message: 'Case not found.'
    };
  }

  target.closed = false;
  target.closedDate = '';

  saveCase(target);

  return {
    success: true
  };
}

// ───────────────────────────────────────────────────────
// CONTACT LOGGING
// ───────────────────────────────────────────────────────

function addContact(caseId, contactData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTACT_SHEET);

  if (!sheet) {
    initializeSheets();
  }

  sheet.appendRow([
    caseId,
    contactData.date || '',
    contactData.method || '',
    contactData.notes || '',
    new Date()
  ]);

  const cases = getCases();
  const target = cases.find(c => c.id === caseId);

  if (target) {
    target.lastContact = contactData.date;
    saveCase(target);
  }

  return {
    success: true
  };
}

function getContactLog(caseId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTACT_SHEET);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();

  return data
    .slice(1)
    .filter(row => row[0] === caseId)
    .map(row => ({
      date: formatDateForClient(row[1]),
      method: row[2],
      notes: row[3]
    }));
}

// ───────────────────────────────────────────────────────
// SEARCH
// ───────────────────────────────────────────────────────

function searchCases(searchTerm) {
  const cases = getCases();

  if (!searchTerm) return cases;

  const term = searchTerm.toLowerCase();

  return cases.filter(c => {
    return (
      (c.caseNum || '').toLowerCase().includes(term) ||
      (c.title || '').toLowerCase().includes(term) ||
      (c.victim || '').toLowerCase().includes(term) ||
      (c.suspect || '').toLowerCase().includes(term)
    );
  });
}

// ───────────────────────────────────────────────────────
// DASHBOARD STATS
// ───────────────────────────────────────────────────────

function getDashboardStats() {
  const cases = getCases();

  const activeCases = cases.filter(c => !c.closed);

  const stats = {
    total: activeCases.length,
    closed: cases.filter(c => c.closed).length,
    saCases: activeCases.filter(c => c.type === 'sa').length,
    felonyCases: activeCases.filter(c => c.classification === 'felony').length,
    misdemeanorCases: activeCases.filter(c => c.classification === 'misdemeanor').length,
    overdueContacts: 0,
    contactWarnings: 0
  };

  activeCases.forEach(c => {
    if (!c.lastContact) return;

    const days = daysSince(c.lastContact);

    if (days >= 30) {
      stats.overdueContacts++;
    } else if (days >= 20) {
      stats.contactWarnings++;
    }
  });

  return stats;
}

// ───────────────────────────────────────────────────────
// EXPORT CASES
// ───────────────────────────────────────────────────────

function exportCasesToCSV() {
  const cases = getCases();

  const rows = [
    [
      'Case Number',
      'Title',
      'Victim',
      'Classification',
      'Type',
      'Opened',
      'Closed',
      'Last Contact'
    ]
  ];

  cases.forEach(c => {
    rows.push([
      c.caseNum,
      c.title,
      c.victim,
      c.classification,
      c.type,
      c.opened,
      c.closed ? 'Yes' : 'No',
      c.lastContact
    ]);
  });

  return rows.map(r => r.join(',')).join('\n');
}

// ───────────────────────────────────────────────────────
// UTILITIES
// ───────────────────────────────────────────────────────

function formatDateForClient(dateValue) {
  if (!dateValue) return '';

  if (Object.prototype.toString.call(dateValue) === '[object Date]') {
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return dateValue;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;

  const d = new Date(dateStr);
  const now = new Date();

  return Math.floor((now - d) / 86400000);
}

// ───────────────────────────────────────────────────────
// TEST DATA
// ───────────────────────────────────────────────────────

function seedTestCases() {
  const testCases = [
    {
      caseNum: '26-04-0001',
      opened: '2026-04-15',
      title: 'Sexual Assault 1st Degree',
      classification: 'felony',
      type: 'sa',
      victim: 'Doe, Jane',
      suspect: 'Smith, John',
      notes: 'Victim interview completed.',
      advocateConsulted: true,
      niceUploaded: true,
      bwcUploaded: true,
      volumized: false,
      closed: false
    },
    {
      caseNum: '26-04-0002',
      opened: '2026-04-20',
      title: 'Burglary 2nd Degree',
      classification: 'felony',
      type: 'standard',
      victim: 'Brown, Michael',
      suspect: 'Unknown',
      notes: 'Pending forensic processing.',
      closed: false
    }
  ];

  testCases.forEach(c => saveCase(c));

  return {
    success: true,
    message: 'Test cases added.'
  };
}
```

# Required HTML Changes

Replace:

```javascript
let cases = JSON.parse(localStorage.getItem('ksp_cases_v1') || '[]');
```

With:

```javascript
let cases = [];

google.script.run
  .withSuccessHandler(function(data) {
    cases = data;
    render();
  })
  .getCases();
```

Replace:

```javascript
function save() {
  localStorage.setItem('ksp_cases_v1', JSON.stringify(cases));
  render();
}
```

With:

```javascript
function save() {
  render();
}
```

Then inside saveCase() in your HTML:

```javascript
google.script.run
  .withSuccessHandler(function() {
    google.script.run
      .withSuccessHandler(function(data) {
        cases = data;
        render();
      })
      .getCases();
  })
  .saveCase(d);
```

For delete:

```javascript
google.script.run
  .withSuccessHandler(function() {
    google.script.run
      .withSuccessHandler(function(data) {
        cases = data;
        render();
      })
      .getCases();
  })
  .deleteCase(cases[i].id);
```

For contact logging:

```javascript
google.script.run
  .withSuccessHandler(function() {
    google.script.run
      .withSuccessHandler(function(data) {
        cases = data;
        render();
      })
      .getCases();
  })
  .addContact(cases[contactIdx].id, {
    date,
    method,
    notes
  });
```

# Deployment

1. Deploy → New Deployment
2. Type → Web App
3. Execute as: Me
4. Access: Anyone with link
5. Deploy

Then open the deployment URL on your phone and choose:

"Add to Home Screen"

This will behave almost like a native app.

