import { createTransport } from 'nodemailer';
import { writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import { config } from '../config.js';

const isPreview = process.argv.includes('--preview');
const isDryRun = process.argv.includes('--dry-run');

/**
 * Send the morning digest HTML email via Gmail SMTP.
 * Falls back to opening an .eml file on macOS if SMTP is unavailable.
 *
 * @param {string} html - Rendered HTML content
 * @param {string} subject - Email subject line
 * @returns {Promise<{ sent: boolean, method: string, info?: string }>}
 */
export async function sendDigestEmail(html, subject) {
  const recipient = config.recipient || 'leonardo.dinic@praetorian.com';
  const sender = config.gmailUser || recipient;

  console.log(`[send-email] Subject: ${subject}`);
  console.log(`[send-email] To: ${recipient}`);
  console.log(`[send-email] HTML: ${html.length.toLocaleString()} chars`);
  console.log('');

  // ── --preview: open in browser only ────────────────────────────────────────
  if (isPreview) {
    await openInBrowser(html);
    return { sent: false, method: 'preview' };
  }

  // ── --dry-run: show stats only ──────────────────────────────────────────────
  if (isDryRun) {
    console.log('[send-email] DRY RUN — email would be sent with the above details.');
    printStats(html);
    return { sent: false, method: 'dry-run' };
  }

  // ── Attempt Gmail SMTP ──────────────────────────────────────────────────────
  const gmailResult = await trySendViaGmail(recipient, sender, subject, html);
  if (gmailResult.sent) return gmailResult;

  // ── Fallback: open .eml in Apple Mail (macOS) ───────────────────────────────
  const emlResult = await trySendViaMailApp(recipient, sender, subject, html);
  if (emlResult.sent) return emlResult;

  // ── All methods failed ──────────────────────────────────────────────────────
  console.error('[send-email] No email method worked. To configure Gmail SMTP:');
  console.error('  1. Enable 2FA on your Google account');
  console.error('  2. Create an App Password at https://myaccount.google.com/apppasswords');
  console.error('  3. Set GMAIL_USER=your.email@praetorian.com in .env');
  console.error('  4. Set GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx in .env');

  return { sent: false, method: 'none' };
}

/**
 * Send via Gmail SMTP using nodemailer (primary method).
 */
async function trySendViaGmail(to, from, subject, html) {
  const user = config.gmailUser || '';
  const pass = config.gmailAppPassword || '';

  if (!user || !pass) {
    console.log('[send-email] Gmail: No credentials configured (GMAIL_USER / GMAIL_APP_PASSWORD).');
    return { sent: false, method: 'gmail' };
  }

  console.log(`[send-email] Sending via Gmail SMTP (${user})...`);

  try {
    const transporter = createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: true,
      },
    });

    const mailOptions = {
      from: `Morning Command Center <${user}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[send-email] Email sent via Gmail (Message-ID: ${info.messageId})`);
    return { sent: true, method: 'gmail', info: info.messageId };
  } catch (err) {
    console.log(`[send-email] Gmail failed: ${err.message}`);
    return { sent: false, method: 'gmail' };
  }
}

/**
 * Send via Apple Mail .eml file (macOS fallback).
 * Opens the email in Mail.app pre-composed for manual send.
 */
async function trySendViaMailApp(to, from, subject, html) {
  if (process.platform !== 'darwin') {
    console.log('[send-email] Mail.app fallback: Not on macOS, skipping.');
    return { sent: false, method: 'mail-app' };
  }

  console.log('[send-email] Opening in Apple Mail...');

  try {
    const toStr = Array.isArray(to) ? to.join(', ') : to;
    const boundary = `boundary-${Date.now()}`;

    const plainText = 'Morning Command Center digest — view this email in an HTML-capable client.';

    const eml = [
      `From: Morning Command Center <${from}>`,
      `To: ${toStr}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      plainText,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
      ``,
      `--${boundary}--`,
    ].join('\r\n');

    const emlPath = '/tmp/praetorian-morning-digest.eml';
    await writeFile(emlPath, eml, 'utf-8');
    execSync(`open "${emlPath}"`);
    console.log('[send-email] Opened in Apple Mail — hit Send to deliver.');
    return { sent: true, method: 'mail-app', info: emlPath };
  } catch (err) {
    console.log(`[send-email] Mail.app failed: ${err.message}`);
    return { sent: false, method: 'mail-app' };
  }
}

/**
 * Save HTML to a temp file and open in the default browser.
 * Used with --preview flag.
 */
async function openInBrowser(html) {
  try {
    const previewPath = '/tmp/praetorian-morning-digest-preview.html';
    await writeFile(previewPath, html, 'utf-8');

    if (process.platform === 'darwin') {
      execSync(`open "${previewPath}"`);
    } else if (process.platform === 'linux') {
      execSync(`xdg-open "${previewPath}"`);
    } else {
      execSync(`start "${previewPath}"`);
    }

    console.log(`[send-email] Preview opened in browser: ${previewPath}`);
  } catch (err) {
    console.error(`[send-email] Could not open browser preview: ${err.message}`);
  }
}

/**
 * Print basic stats about the HTML content for dry-run mode.
 */
function printStats(html) {
  const actionMatches = html.match(/action-row/g) || [];
  const calendarMatches = html.match(/calendar-row/g) || [];

  console.log('\n[send-email] Digest statistics:');
  console.log(`  HTML size: ${Math.round(html.length / 1024)}KB`);

  // Count sections that were rendered
  const hasSummary = html.includes('DAY_SUMMARY') === false && html.includes('day strategy');
  const sections = [];
  if (!html.includes('{{#IF_CALENDAR}}')) sections.push('Calendar');
  if (!html.includes('{{#IF_ACTIONS}}')) sections.push('Action Items');
  if (!html.includes('{{#IF_SLACK}}')) sections.push('Slack');
  if (!html.includes('{{#IF_EMAIL}}')) sections.push('Email');
  if (!html.includes('{{#IF_LINEAR}}')) sections.push('Linear');
  if (sections.length > 0) {
    console.log(`  Sections: ${sections.join(', ')}`);
  }
}
