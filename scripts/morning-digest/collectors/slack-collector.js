import { WebClient } from '@slack/web-api';
import { config } from '../config.js';

const TWENTY_FOUR_HOURS_AGO = () => String(Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000));

/**
 * Resolve a Slack user ID to a display name.
 * Caches results to avoid repeated API calls.
 */
async function resolveUserName(client, userId, cache) {
  if (cache.has(userId)) return cache.get(userId);
  try {
    const res = await client.users.info({ user: userId });
    const name = res.user?.profile?.display_name || res.user?.real_name || userId;
    cache.set(userId, name);
    return name;
  } catch {
    cache.set(userId, userId);
    return userId;
  }
}

/**
 * Fetch DMs, group chats, and @mentions from the last 24 hours.
 *
 * Returns:
 * {
 *   dms:        [{ sender, text, timestamp, channel }],
 *   groupChats: [{ sender, text, timestamp, channelName }],
 *   mentions:   [{ sender, text, timestamp, channelName }],
 * }
 */
export default async function collectSlack() {
  const empty = { dms: [], groupChats: [], mentions: [] };

  if (!config.slackBotToken) {
    console.warn('[slack-collector] No SLACK_BOT_TOKEN configured — skipping Slack collection.');
    return empty;
  }

  const client = new WebClient(config.slackBotToken);
  const oldest = TWENTY_FOUR_HOURS_AGO();
  const userCache = new Map();

  // ── 1. DMs (im) ────────────────────────────────────────────────────────────
  const dms = [];
  try {
    const convList = await client.conversations.list({
      types: 'im',
      exclude_archived: true,
      limit: 200,
    });

    for (const conv of convList.channels || []) {
      // Skip the bot's own DM with itself
      if (conv.user === config.slackUserId) continue;

      try {
        const history = await client.conversations.history({
          channel: conv.id,
          oldest,
          limit: 50,
        });

        for (const msg of history.messages || []) {
          if (!msg.text || msg.subtype) continue;
          const sender = await resolveUserName(client, msg.user, userCache);
          dms.push({
            sender,
            text: msg.text,
            timestamp: msg.ts,
            channel: conv.id,
          });
        }
      } catch (err) {
        console.warn(`[slack-collector] Could not fetch DM history for ${conv.id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`[slack-collector] Could not list DMs: ${err.message}`);
  }

  // ── 2. Group chats (mpim) ──────────────────────────────────────────────────
  const groupChats = [];
  try {
    const mpimList = await client.conversations.list({
      types: 'mpim',
      exclude_archived: true,
      limit: 200,
    });

    for (const conv of mpimList.channels || []) {
      try {
        const history = await client.conversations.history({
          channel: conv.id,
          oldest,
          limit: 50,
        });

        for (const msg of history.messages || []) {
          if (!msg.text || msg.subtype) continue;
          const sender = await resolveUserName(client, msg.user, userCache);
          groupChats.push({
            sender,
            text: msg.text,
            timestamp: msg.ts,
            channelName: conv.name || conv.id,
          });
        }
      } catch (err) {
        console.warn(`[slack-collector] Could not fetch group chat history for ${conv.id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`[slack-collector] Could not list group chats: ${err.message}`);
  }

  // ── 3. @mentions ───────────────────────────────────────────────────────────
  const mentions = [];
  if (config.slackUserId) {
    try {
      const searchRes = await client.search.messages({
        query: `<@${config.slackUserId}>`,
        sort: 'timestamp',
        sort_dir: 'desc',
        count: 50,
      });

      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
      for (const match of searchRes.messages?.matches || []) {
        const msgTs = parseFloat(match.ts) * 1000;
        if (msgTs < cutoffMs) continue;

        const sender = await resolveUserName(client, match.user, userCache);
        mentions.push({
          sender,
          text: match.text,
          timestamp: match.ts,
          channelName: match.channel?.name || match.channel?.id || 'unknown',
        });
      }
    } catch (err) {
      console.warn(`[slack-collector] Could not search mentions: ${err.message}`);
    }
  }

  return { dms, groupChats, mentions };
}
