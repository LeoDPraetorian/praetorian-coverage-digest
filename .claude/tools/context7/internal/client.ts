// Context7 HTTP API Client
// Uses CONTEXT7_API_KEY from environment

const CONTEXT7_API_KEY = process.env.CONTEXT7_API_KEY;
const CONTEXT7_API_BASE = 'https://api.context7.com/v1'; // Adjust if different

if (!CONTEXT7_API_KEY) {
  throw new Error('CONTEXT7_API_KEY not found in environment variables');
}

/**
 * Call context7 API
 */
async function callContext7API(endpoint: string, params: any): Promise<any> {
  const url = `${CONTEXT7_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONTEXT7_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Context7 API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Resolve library ID using context7 API
 */
export async function resolveLibraryIdAPI(params: {
  name: string;
  version?: string;
  ecosystem?: string;
}): Promise<any> {
  return callContext7API('/resolve-library', params);
}

/**
 * Get library documentation using context7 API
 */
export async function getLibraryDocsAPI(params: {
  libraryId: string;
}): Promise<any> {
  return callContext7API('/library-docs', params);
}
