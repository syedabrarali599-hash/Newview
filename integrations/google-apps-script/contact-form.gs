/**
 * New View — contact form → Google Sheet + email notification.
 *
 * Setup (about 5 minutes):
 *  1. Create a Google Sheet (e.g. "New View enquiries").
 *  2. In the sheet: Extensions → Apps Script. Delete the sample code and
 *     paste this whole file. Edit NOTIFY_EMAIL and SECRET below.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me      Who has access: Anyone
 *     Click Deploy, allow the permissions, and copy the Web app URL.
 *  4. In Vercel → Project → Settings → Environment Variables add:
 *       CONTACT_WEBHOOK_URL    = the Web app URL from step 3
 *       CONTACT_WEBHOOK_SECRET = the same value as SECRET below
 *     then redeploy.
 *
 * Every message adds a row to the "Enquiries" tab and emails NOTIFY_EMAIL.
 * The sheet can be downloaded as Excel any time (File → Download → .xlsx).
 */

const NOTIFY_EMAIL = "hello@newview.co"; // where notifications go
const SECRET = "change-me-to-a-long-random-string"; // must match CONTACT_WEBHOOK_SECRET
const SHEET_NAME = "Enquiries";
const HEADERS = ["Received", "Full name", "Email", "Phone", "Company", "Message", "Page"];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (SECRET && data.secret !== SECRET) return json_({ ok: false, error: "unauthorised" });

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

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
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
