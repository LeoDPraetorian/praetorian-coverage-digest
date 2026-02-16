import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: join(__dirname, '.env') });

export const config = {
  // SendGrid
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },

  // Email settings
  email: {
    from: {
      email: process.env.DIGEST_FROM_EMAIL || 'digest@praetorian.com',
      name: process.env.DIGEST_FROM_NAME || 'Praetorian Coverage Digest',
    },
    to: process.env.DIGEST_RECIPIENT || 'leonardo@praetorian.com',
    cc: process.env.DIGEST_CC
      ? process.env.DIGEST_CC.split(',').map(e => e.trim()).filter(Boolean)
      : [],
    replyTo: process.env.DIGEST_RECIPIENT || 'leonardo@praetorian.com',
  },

  // Behavior
  skipIfEmpty: process.env.SKIP_IF_EMPTY !== 'false',
  dryRun: process.env.DRY_RUN === 'true',

  // Paths
  paths: {
    root: __dirname,
    state: join(__dirname, 'state'),
    templates: __dirname,
    manualSubmissions: join(__dirname, '..', 'coverage-tracker', 'manual-submissions.json'),
    coverageTracker: join(__dirname, '..', 'coverage-tracker', 'coverage-tracker.json'),
  },

  // Praetorian tools to monitor
  tools: [
    'Brutus', 'Augustus', 'Julius', 'Nosey Parker', 'Gato', 'Gato-X',
    'FingerprintX', 'Nebula', 'Nerva', 'Nero', 'Pius', 'Konstellation',
    'Snowcat', 'Chariot', 'GoKart',
  ],

  // RSS feeds to monitor (cybersecurity publications)
  rssFeeds: [
    {
      name: 'Help Net Security',
      url: 'https://www.helpnetsecurity.com/feed/',
      icon: '🔒',
    },
    {
      name: 'Dark Reading',
      url: 'https://www.darkreading.com/rss.xml',
      icon: '🌑',
    },
    {
      name: 'SC Media',
      url: 'https://www.scworld.com/feed',
      icon: '🛡️',
    },
    {
      name: 'Bleeping Computer',
      url: 'https://www.bleepingcomputer.com/feed/',
      icon: '💻',
    },
    {
      name: 'The Hacker News',
      url: 'https://feeds.feedburner.com/TheHackersNews',
      icon: '📰',
    },
    {
      name: 'SecurityWeek',
      url: 'https://www.securityweek.com/feed/',
      icon: '🔐',
    },
  ],

  // Google Alerts RSS feeds (user adds their own)
  googleAlertsFeeds: process.env.GOOGLE_ALERTS_RSS_URLS
    ? process.env.GOOGLE_ALERTS_RSS_URLS.split(',').map(url => ({
        name: 'Google Alerts',
        url: url.trim(),
        icon: '🔔',
      }))
    : [],

  // Search terms for filtering RSS items
  searchTerms: [
    'praetorian',
    'praetorian-inc',
    'praetorian security',
    'praetorian chariot',
    // Tool-specific terms
    'brutus credential',
    'augustus llm',
    'julius llm fingerprint',
    'nosey parker secret',
    'noseyparker',
    'fingerprintx',
    'gato github actions',
    'gato-x',
  ],
};
