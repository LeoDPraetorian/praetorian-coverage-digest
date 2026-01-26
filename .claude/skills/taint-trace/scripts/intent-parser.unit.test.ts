// intent-parser.unit.test.ts
import { describe, it, expect } from 'vitest';
import { parseIntent } from '../lib/intent-parser.js';

describe('Intent Parser - Binary Path', () => {
  it('should extract absolute binary path', () => {
    const result = parseIntent('Trace TCP input in /bins/server.exe');
    expect(result.binaryPath).toBe('/bins/server.exe');
  });

  it('should extract relative binary path', () => {
    const result = parseIntent('Trace all inputs in ./malware.exe');
    expect(result.binaryPath).toBe('./malware.exe');
  });

  it('should throw error if no binary path found', () => {
    expect(() => parseIntent('Trace TCP input')).toThrow('No binary path');
  });
});

describe('Intent Parser - Source Filters', () => {
  it('should detect TCP/network sources', () => {
    const result = parseIntent('Trace TCP input in server.exe');
    expect(result.sources).toEqual(['recv', 'recvfrom', 'recvmsg', 'accept', 'read']);
  });

  it('should detect file input sources', () => {
    const result = parseIntent('Trace file input in parser');
    expect(result.sources).toEqual(['fopen', 'fread', 'mmap', 'read', 'open', 'readfile']);
  });

  it('should detect argv sources', () => {
    const result = parseIntent('Where does argv[1] go in ./target');
    expect(result.sources).toEqual(['main']);
  });

  it('should detect all inputs', () => {
    const result = parseIntent('Trace all inputs in malware.exe');
    expect(result.sources).toContain('recv');
    expect(result.sources).toContain('fopen');
    expect(result.sources).toContain('main');
  });
});

describe('Intent Parser - Custom Sinks', () => {
  it('should use default sinks when not specified', () => {
    const result = parseIntent('Trace TCP input in server.exe');
    expect(result.sinks).toContain('strcpy');
    expect(result.sinks).toContain('system');
  });

  it('should detect crypto sink requests', () => {
    const result = parseIntent('Trace all inputs and flag crypto functions in app.exe');
    expect(result.sinks).toContain('EVP_EncryptInit');
  });

  it('should detect specific sink requests', () => {
    const result = parseIntent('Trace file input to strcpy in binary.exe');
    expect(result.sinks).toEqual(['strcpy']);
  });
});
