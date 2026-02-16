import sgMail from '@sendgrid/mail';
import { config } from '../config.js';

/**
 * Send the digest email via SendGrid.
 *
 * @param {string} subject - Email subject line
 * @param {string} htmlContent - Rendered HTML email body
 * @returns {Promise<void>}
 */
export async function sendDigestEmail(subject, htmlContent) {
  if (!config.sendgrid.apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured. Add it to .env');
  }

  sgMail.setApiKey(config.sendgrid.apiKey);

  const msg = {
    to: config.email.to,
    from: {
      email: config.email.from.email,
      name: config.email.from.name,
    },
    replyTo: config.email.replyTo,
    subject,
    html: htmlContent,
  };

  // Add CC recipients if configured
  if (config.email.cc.length > 0) {
    msg.cc = config.email.cc;
  }

  if (config.dryRun) {
    console.log('\n=== DRY RUN - Email would be sent ===');
    console.log(`  To: ${msg.to}`);
    console.log(`  CC: ${msg.cc ? msg.cc.join(', ') : 'none'}`);
    console.log(`  From: ${msg.from.name} <${msg.from.email}>`);
    console.log(`  Subject: ${msg.subject}`);
    console.log(`  HTML Length: ${htmlContent.length} chars`);
    console.log('=====================================\n');
    return;
  }

  try {
    await sgMail.send(msg);
    console.log(`  Email sent to ${msg.to}${msg.cc ? ` (cc: ${msg.cc.join(', ')})` : ''}`);
  } catch (err) {
    if (err.response) {
      console.error('SendGrid error:', err.response.body);
    }
    throw new Error(`Failed to send email: ${err.message}`);
  }
}
