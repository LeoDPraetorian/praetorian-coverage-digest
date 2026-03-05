import { config as dotenvConfig } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: join(__dirname, '.env') });

// Load credentials from secure file or env vars
function loadCredentials() {
  const credPath = join(homedir(), '.praetorian', 'morning-digest', 'credentials.json');
  try {
    return JSON.parse(readFileSync(credPath, 'utf-8'));
  } catch {
    return {};
  }
}

const creds = loadCredentials();

export const config = {
  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || creds.anthropic_api_key || '',

  // Slack
  slackBotToken: process.env.SLACK_BOT_TOKEN || creds.slack_bot_token || '',
  slackUserId: process.env.SLACK_USER_ID || creds.slack_user_id || '',

  // Gmail
  gmailUser: process.env.GMAIL_USER || creds.gmail_user || 'leonardo.dinic@praetorian.com',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || creds.gmail_app_password || '',

  // Google Calendar OAuth2
  googleClientId: process.env.GOOGLE_CLIENT_ID || creds.google_client_id || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || creds.google_client_secret || '',
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || creds.google_refresh_token || '',

  // Delivery
  recipient: process.env.DIGEST_RECIPIENT || 'leonardo.dinic@praetorian.com',
  timezone: 'America/New_York',

  // Paths
  paths: {
    root: __dirname,
    templates: join(__dirname, 'templates'),
    assets: join(__dirname, 'assets'),
    linearCli: join(__dirname, '..', '..', '.claude', 'tools', 'linear', 'cli.ts'),
  },

  // Logo
  logoUrl: 'https://raw.githubusercontent.com/LeoDPraetorian/praetorian-coverage-digest/main/scripts/coverage-digest/assets/logo-white.png',

  // Branding colors
  colors: {
    bg: '#0D0D0D',
    cardBg: '#1F252A',
    red: '#E63948',
    cyan: '#11C3DB',
    gold: '#D4AF37',
    green: '#34C759',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A4A8',
    textMuted: '#535B61',
    border: '#3A4044',
  },
};
