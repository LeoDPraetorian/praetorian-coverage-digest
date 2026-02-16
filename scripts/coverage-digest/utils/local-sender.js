import { spawn } from 'child_process';
import { config } from '../config.js';

/**
 * Send email using the local macOS sendmail binary.
 * Zero-config fallback when no external email service is configured.
 * Note: Emails may land in spam on first send.
 */
export async function sendViaLocalMail(subject, htmlContent) {
  const to = config.email.to;
  const from = config.email.from.email;
  const fromName = config.email.from.name;

  const boundary = `boundary-${Date.now()}`;

  const message = [
    `From: ${fromName} <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `Praetorian Coverage Digest - View this email in an HTML-capable email client.`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlContent,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  if (config.dryRun) {
    console.log('\n=== DRY RUN (local sendmail) ===');
    console.log(`  To: ${to}`);
    console.log(`  From: ${fromName} <${from}>`);
    console.log(`  Subject: ${subject}`);
    console.log(`  HTML Length: ${htmlContent.length} chars`);
    console.log('================================\n');
    return;
  }

  return new Promise((resolve, reject) => {
    const sendmail = spawn('/usr/sbin/sendmail', ['-t', '-oi'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    sendmail.stderr.on('data', (data) => { stderr += data.toString(); });

    sendmail.on('close', (code) => {
      if (code === 0) {
        console.log(`  Email sent to ${to} via local sendmail`);
        resolve();
      } else {
        reject(new Error(`sendmail exited with code ${code}: ${stderr}`));
      }
    });

    sendmail.stdin.write(message);
    sendmail.stdin.end();
  });
}
