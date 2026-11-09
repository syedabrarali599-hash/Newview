/**
 * New View — contact form → Google Sheet + email notification.
 *
 * Setup (about 5 minutes):
 *  1. Create a Google Sheet (e.g. "New View enquiries").
 *  2. In the sheet: Extensions → Apps Script. Delete the sample code and
 *     paste this whole file. Edit NOTIFY_EMAIL and SECRET below, then Save.
 *  3. Choose "testSetup" in the function menu at the top and click Run.
 *     Allow the permissions Google asks for. A test row appears in the
 *     sheet (and a test email arrives, if NOTIFY_EMAIL is set).
 *  4. Deploy → New deployment → type "Web app".
 *       Execute as: Me      Who has access: Anyone   (not "Anyone with a Google account")
 *     Click Deploy and copy the Web app URL (it ends in /exec).
 *  5. In Vercel → Project → Settings → Environment Variables add:
 *       CONTACT_WEBHOOK_URL    = the Web app URL from step 4
 *       CONTACT_WEBHOOK_SECRET = the same value as SECRET below
 *     then redeploy.
 *  6. Open https://<your site>/api/contact in a browser: it checks the
 *     connection and tells you what to fix, if anything.
 *
 * After editing this script later, publish the change with
 * Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy
 * (the web app keeps running the old version until you do).
 *
 * Every message adds a row to the "Enquiries" tab and, if NOTIFY_EMAIL is
 * set, emails it. Leave NOTIFY_EMAIL as "" to only use the sheet. The sheet
 * can be downloaded as Excel any time (File → Download → .xlsx).
 */

const NOTIFY_EMAIL = "hello@newview.co"; // where notifications go ("" = sheet only, no emails)
const SECRET = "change-me-to-a-long-random-string"; // must match CONTACT_WEBHOOK_SECRET
const SHEET_NAME = "Enquiries";
const HEADERS = ["Received", "Full name", "Email", "Phone", "Company", "Message", "Page"];
const SCRIPT_VERSION = 2;

/** Opening the web app URL in a browser shows this — proof it's deployed and public. */
function doGet() {
  return json_({ ok: true, script: "new-view-contact", version: SCRIPT_VERSION });
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (SECRET && data.secret !== SECRET) return json_({ ok: false, error: "unauthorised" });

    // Connection check from the website (/api/contact): nothing is saved.
    if (data.action === "ping") return json_({ ok: true, pong: true, version: SCRIPT_VERSION });

    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      safe_(data.name),
      safe_(data.email),
      safe_(data.phone),
      safe_(data.company),
      safe_(data.message),
      safe_(data.source),
    ]);

    // The row is saved first; a problem with email never loses the enquiry.
    let emailed = false;
    if (NOTIFY_EMAIL) {
      try {
        sendNotification_(data);
        emailed = true;
      } catch (mailErr) {
        console.error("Email notification failed: " + mailErr);
      }
    }

    return json_({ ok: true, emailed: emailed });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * Run this once from the editor (pick "testSetup" at the top, click Run) to
 * grant the permissions and check the sheet and email both work.
 */
function testSetup() {
  getSheet_().appendRow([new Date(), "Setup test", "", "", "", "Test row from testSetup — you can delete it.", "testSetup"]);
  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(NOTIFY_EMAIL, "New View contact form — test email", "Your contact form script can write to the sheet and send email.");
  }
  Logger.log("All good: a test row was added" + (NOTIFY_EMAIL ? " and a test email was sent to " + NOTIFY_EMAIL : "") + ".");
}

function sendNotification_(data) {
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: String(data.email || ""),
    subject: "New enquiry from " + String(data.name || "your website") + " — New View website",
    body: [
      "A new query has been registered on your website.",
      "",
      "Name: " + (data.name || ""),
      "Email: " + (data.email || ""),
      "Phone: " + (data.phone || "—"),
      "Company: " + (data.company || "—"),
      "",
      "Message:",
      String(data.message || ""),
      "",
      "All enquiries: " + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    ].join("\n"),
    htmlBody: emailHtml_(data),
  });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

/** Stop text that starts with = + - @ from being run as a spreadsheet formula. */
function safe_(v) {
  const s = String(v == null ? "" : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function esc_(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailHtml_(d) {
  const row = function (label, value) {
    return (
      '<tr><td style="padding:6px 16px 6px 0;color:#7a6a62;vertical-align:top">' + label +
      '</td><td style="padding:6px 0;color:#220d04">' + (esc_(value) || "—") + "</td></tr>"
    );
  };
  return (
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#220d04">' +
    '<p style="margin:0 0 4px;color:#e85313;font-weight:bold">New View website</p>' +
    '<h2 style="margin:0 0 16px;font-weight:normal">A new query has been registered</h2>' +
    "<table>" + row("Name", d.name) + row("Email", d.email) + row("Phone", d.phone) + row("Company", d.company) + "</table>" +
    '<p style="margin:16px 0 4px;color:#7a6a62">Message</p>' +
    '<p style="margin:0;white-space:pre-wrap">' + esc_(d.message) + "</p>" +
    "</div>"
  );
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
