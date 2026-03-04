import { ImapFlow } from 'imapflow';
import { config } from '../config.js';

/**
 * Extract a plain-text snippet (first 200 chars) from a parsed message body.
 */
function extractSnippet(source) {
  if (!source) return '';
  // Strip HTML tags if present, then trim whitespace
  const text = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 200);
}

/**
 * Fetch all UNSEEN messages from Gmail INBOX via IMAP.
 *
 * Returns:
 * {
 *   unreadEmails: [{ from, subject, date, snippet }],
 *   count: N,
 * }
 */
export default async function collectEmail() {
  const empty = { unreadEmails: [], count: 0 };

  if (!config.gmailAppPassword || !config.gmailUser) {
    console.warn('[email-collector] Gmail credentials not configured — skipping email collection.');
    return empty;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
    logger: false,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const unreadEmails = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search for UNSEEN messages
      const uids = await client.search({ seen: false });

      if (uids.length > 0) {
        // Limit to 20 most recent unread
        const recentUids = uids.slice(-20);
        for await (const msg of client.fetch(recentUids, {
          envelope: true,
          bodyStructure: true,
          bodyParts: ['TEXT'],
          source: false,
        })) {
          try {
            const envelope = msg.envelope || {};
            const from = envelope.from?.[0]
              ? `${envelope.from[0].name || ''} <${envelope.from[0].address}>`.trim()
              : 'Unknown';

            // Check if addressed directly to Leonardo (To: field vs CC:)
            const toAddresses = (envelope.to || []).map(a => a.address?.toLowerCase() || '');
            const ccAddresses = (envelope.cc || []).map(a => a.address?.toLowerCase() || '');
            const isDirectlyAddressed = toAddresses.some(a => a.includes('leonardo'));

            // Extract snippet from body parts if available
            let snippet = '';
            if (msg.bodyParts) {
              for (const [, value] of msg.bodyParts) {
                if (value) {
                  snippet = extractSnippet(value.toString('utf-8'));
                  break;
                }
              }
            }

            unreadEmails.push({
              from,
              subject: envelope.subject || '(no subject)',
              date: envelope.date ? envelope.date.toISOString() : null,
              snippet,
              to: toAddresses.join(', '),
              cc: ccAddresses.join(', '),
              isDirectlyAddressed,
            });
          } catch (msgErr) {
            console.warn(`[email-collector] Could not parse message: ${msgErr.message}`);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.warn(`[email-collector] IMAP error: ${err.message}`);
    // Ensure connection is closed on error
    try { await client.logout(); } catch { /* ignore */ }
    return empty;
  }

  return { unreadEmails, count: unreadEmails.length };
}
