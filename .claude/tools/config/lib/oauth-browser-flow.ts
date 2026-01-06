/**
 * OAuth Browser Flow Handler
 *
 * Handles the browser-based OAuth authorization flow:
 * 1. Start local callback server
 * 2. Open browser to authorization URL
 * 3. Wait for callback with authorization code
 * 4. Exchange code for tokens
 */

import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Callback result from OAuth flow
 */
export interface CallbackResult {
  code: string;
  state: string;
}

/**
 * Callback server instance
 */
export interface CallbackServer {
  server: http.Server;
  waitForCallback: () => Promise<CallbackResult>;
  close: () => void;
}

/**
 * Create a local callback server for OAuth redirect
 *
 * @param port - Port to listen on
 * @returns Server instance and callback promise
 */
export function createCallbackServer(port: number): CallbackServer {
  let resolveCallback: (result: CallbackResult) => void;
  let rejectCallback: (error: Error) => void;

  const callbackPromise = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    const parsedUrl = url.parse(req.url, true);

    // Handle callback (matches Linear redirect URI: /oauth/callback)
    if (parsedUrl.pathname === '/oauth/callback') {
      const { code, state, error, error_description } = parsedUrl.query;

      if (error) {
        res.writeHead(400);
        res.end(`
          <html>
            <body>
              <h1>Authorization Failed</h1>
              <p>${error}: ${error_description || 'Unknown error'}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        rejectCallback(new Error(`OAuth error: ${error} - ${error_description}`));
        return;
      }

      if (!code || !state) {
        res.writeHead(400);
        res.end('Missing code or state');
        rejectCallback(new Error('Missing authorization code or state'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authorization Successful</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 2000);</script>
          </body>
        </html>
      `);

      resolveCallback({
        code: code as string,
        state: state as string,
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port);

  return {
    server,
    waitForCallback: () => callbackPromise,
    close: () => server.close(),
  };
}

/**
 * Open URL in default browser
 *
 * @param url - URL to open
 */
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  await execAsync(command);
}

/**
 * Start the OAuth browser flow
 *
 * @param authorizationUrl - URL to open in browser
 * @param expectedState - Expected state parameter for CSRF validation
 * @param port - Port for callback server (default: 14881 to match Linear MCP)
 * @param timeoutMs - Timeout for authorization (default: 5 minutes)
 * @returns Authorization code
 */
export async function startOAuthFlow(
  authorizationUrl: string,
  expectedState: string,
  port: number = 14881,
  timeoutMs: number = 5 * 60 * 1000
): Promise<string> {
  // Start callback server
  const { server, waitForCallback, close } = createCallbackServer(port);

  try {
    // Open browser
    console.log('\n🔐 Opening browser for Linear authorization...');
    console.log('If the browser does not open, visit:');
    console.log(authorizationUrl);
    console.log('\nWaiting for authorization...\n');

    await openBrowser(authorizationUrl);

    // Wait for callback with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Authorization timeout')), timeoutMs);
    });

    const result = await Promise.race([waitForCallback(), timeoutPromise]);

    // Validate state (CSRF protection)
    if (result.state !== expectedState) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    console.log('✅ Authorization successful!\n');
    return result.code;
  } finally {
    close();
  }
}
