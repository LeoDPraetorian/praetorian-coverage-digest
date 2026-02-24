#!/usr/bin/env node

/**
 * Praetorian Coverage Digest - Email Sender
 *
 * Sends the digest email using multiple fallback methods:
 *   1. Resend API (if RESEND_API_KEY is set)
 *   2. SendGrid API (if SENDGRID_API_KEY is set)
 *   3. Apple Mail via .eml file (macOS fallback)
 *
 * Usage:
 *   node send-email.js                    # Send latest preview.html
 *   node send-email.js --preview-only     # Just open in browser, don't email
 *   node send-email.js --dry-run          # Show what would be sent
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDryRun = process.argv.includes('--dry-run');
const isPreviewOnly = process.argv.includes('--preview-only');

async function main() {
  const previewPath = join(config.paths.root, 'preview.html');

  let html;
  try {
    html = await readFile(previewPath, 'utf-8');
  } catch {
    console.error('No preview.html found. Run the pipeline first:');
    console.error('  node send-test.js --all');
    process.exit(1);
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Count items from tracker
  let itemCount = 0;
  try {
    const tracker = JSON.parse(await readFile(config.paths.coverageTracker, 'utf-8'));
    itemCount = tracker.filter(i => i.status === 'new' || i.status === 'sent').length;
  } catch { /* ignore */ }

  const subject = `Praetorian Coverage Digest - ${today}${itemCount > 0 ? ` - ${itemCount} items` : ''}`;
  const to = config.email.to;

  console.log(`Subject: ${subject}`);
  console.log(`To: ${to}`);
  console.log(`HTML: ${html.length} chars\n`);

  if (isPreviewOnly) {
    execSync(`open "${previewPath}"`);
    console.log('Opened preview in browser.');
    return;
  }

  if (isDryRun) {
    console.log('DRY RUN - email would be sent with the above details.');
    return;
  }

  // Try send methods in order
  if (await trySendViaResend(to, subject, html)) return;
  if (await trySendViaSendGrid(to, subject, html)) return;
  if (await trySendViaMailApp(to, subject, html)) return;

  console.error('\nNo email method worked. Set up Resend (recommended):');
  console.error('  1. Sign up at https://resend.com (free, GitHub OAuth)');
  console.error('  2. Copy your API key');
  console.error('  3. Run: echo "RESEND_API_KEY=re_xxxxx" >> .env');
  console.error('  4. Run this script again');
  process.exit(1);
}

/**
 * Send via Resend API (recommended - free tier, 100 emails/day)
 */
async function trySendViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    console.log('Resend: No API key (RESEND_API_KEY not set)');
    return false;
  }

  console.log('Sending via Resend API...');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Praetorian Coverage Digest <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✓ Email sent via Resend (ID: ${data.id})`);
      return true;
    } else {
      console.log(`Resend error: ${data.message || JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    console.log(`Resend failed: ${err.message}`);
    return false;
  }
}

/**
 * Send via SendGrid API (legacy fallback)
 */
async function trySendViaSendGrid(to, subject, html) {
  const apiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY || '';
  if (!apiKey) {
    console.log('SendGrid: No API key');
    return false;
  }

  console.log('Sending via SendGrid API...');
  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from: { email: config.email.from.email, name: config.email.from.name },
      subject,
      html,
    });
    console.log(`✓ Email sent via SendGrid`);
    return true;
  } catch (err) {
    console.log(`SendGrid failed: ${err.message}`);
    return false;
  }
}

/**
 * Send via Apple Mail .eml file (macOS fallback - opens compose window)
 */
async function trySendViaMailApp(to, subject, html) {
  if (process.platform !== 'darwin') {
    console.log('Mail.app: Not on macOS');
    return false;
  }

  console.log('Opening in Apple Mail...');
  try {
    const boundary = `boundary-${Date.now()}`;
    const eml = [
      `From: Praetorian Coverage Digest <${config.email.from.email}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      `Praetorian Coverage Digest - View this email in an HTML-capable client.`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
      ``,
      `--${boundary}--`,
    ].join('\r\n');

    const emlPath = '/tmp/praetorian-digest.eml';
    await writeFile(emlPath, eml);
    execSync(`open "${emlPath}"`);
    console.log('✓ Opened in Apple Mail - hit Send to deliver');
    return true;
  } catch (err) {
    console.log(`Mail.app failed: ${err.message}`);
    return false;
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
