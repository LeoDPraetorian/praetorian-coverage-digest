#!/usr/bin/env node

/**
 * Google Calendar OAuth2 Setup
 *
 * One-time setup to authorize Google Calendar access.
 * Opens a browser for authorization and saves the refresh token.
 *
 * Usage:
 *   node setup-google-oauth.js
 */

import { google } from 'googleapis';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

// Google OAuth2 settings for a "Desktop" app
// You need to create these at https://console.cloud.google.com/
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const REDIRECT_URI = 'http://localhost:18923/oauth2callback';
const CRED_PATH = join(homedir(), '.praetorian', 'morning-digest', 'credentials.json');

async function main() {
  console.log('\n  Google Calendar OAuth2 Setup');
  console.log('  ────────────────────────────\n');

  // Load existing credentials
  let creds;
  try {
    creds = JSON.parse(readFileSync(CRED_PATH, 'utf-8'));
  } catch {
    console.error('  Error: credentials.json not found at', CRED_PATH);
    process.exit(1);
  }

  if (!creds.google_client_id || !creds.google_client_secret) {
    console.log('  You need Google OAuth2 client credentials.');
    console.log('  Follow these steps:\n');
    console.log('  1. Go to https://console.cloud.google.com/apis/credentials');
    console.log('  2. Create a project (or select existing)');
    console.log('  3. Enable "Google Calendar API" at:');
    console.log('     https://console.cloud.google.com/apis/library/calendar-json.googleapis.com');
    console.log('  4. Create credentials > OAuth client ID > Desktop app');
    console.log('  5. Copy the Client ID and Client Secret\n');
    console.log('  Then add to ~/.praetorian/morning-digest/credentials.json:');
    console.log('    "google_client_id": "YOUR_CLIENT_ID"');
    console.log('    "google_client_secret": "YOUR_CLIENT_SECRET"\n');
    console.log('  Then run this script again.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    creds.google_client_id,
    creds.google_client_secret,
    REDIRECT_URI
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('  Opening browser for authorization...\n');

  // Start local server to receive the callback
  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:18923`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Authorization Failed</h1><p>You can close this window.</p></body></html>');
        server.close();
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="background:#0D0D0D;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><div style="text-align:center;"><h1 style="color:#34C759;">Authorization Successful!</h1><p style="color:#A0A4A8;">You can close this window and return to the terminal.</p></div></body></html>');
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    server.listen(18923, () => {
      // Open browser
      try {
        execSync(`open "${authUrl}"`);
      } catch {
        console.log(`  Browser didn't open. Visit this URL:\n  ${authUrl}\n`);
      }
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out after 2 minutes'));
    }, 120000);
  });

  console.log('  Authorization received. Exchanging for tokens...\n');

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error('  Error: No refresh token received. Try revoking access and running again.');
    console.error('  Revoke at: https://myaccount.google.com/permissions');
    process.exit(1);
  }

  // Save refresh token
  creds.google_refresh_token = tokens.refresh_token;
  writeFileSync(CRED_PATH, JSON.stringify(creds, null, 2) + '\n');

  console.log('  Refresh token saved to credentials.json');

  // Verify by fetching today's calendar
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const count = events.data.items?.length || 0;
  console.log(`  Verification: Found ${count} events on your calendar today.`);
  console.log('\n  Google Calendar setup complete!\n');
}

main().catch(err => {
  console.error('\n  Error:', err.message);
  process.exit(1);
});
