// cache.ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function hashBinaryPath(binaryPath: string): string {
  return crypto.createHash('sha256')
    .update(binaryPath)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for brevity
}

export interface CacheData {
  binary_path: string;
  analyzed_at: string;
  sources: any[];
  taint_graph?: any;
  paths: any[];
}

function getCachePath(binaryPath: string, cacheDir: string): string {
  const hash = hashBinaryPath(binaryPath);
  return path.join(cacheDir, `${hash}.json`);
}

export function loadCache(
  binaryPath: string,
  cacheDir: string = '.claude/.cache/taint-analysis'
): CacheData | null {
  const cachePath = getCachePath(binaryPath, cacheDir);

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load cache:', error);
    return null;
  }
}

export function saveCache(
  binaryPath: string,
  data: CacheData,
  cacheDir: string = '.claude/.cache/taint-analysis'
): void {
  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cachePath = getCachePath(binaryPath, cacheDir);
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}
