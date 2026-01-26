import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWithSecrets } from './run-with-secrets.js';
import { OpClientError } from './lib/op-client.js';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('runWithSecrets', () => {
  const mockExec = exec as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path', () => {
    it('executes command with secrets from env file', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'success output', '');
      });

      const result = await runWithSecrets.execute({
        command: 'echo',
        args: ['hello'],
        envFile: '.claude/tools/1password/secrets.env'
      });

      expect(result).toEqual({
        stdout: 'success output',
        stderr: '',
        exitCode: 0
      });
      expect(mockExec).toHaveBeenCalledWith(
        'op run --env-file=".claude/tools/1password/secrets.env" -- echo hello',
        { timeout: 60000 },
        expect.any(Function)
      );
    });
  });

  describe('default env file path', () => {
    it('uses default env file path when not specified', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'output', '');
      });

      await runWithSecrets.execute({
        command: 'npm',
        args: ['test']
      });

      expect(mockExec).toHaveBeenCalledWith(
        'op run --env-file=".claude/tools/1password/secrets.env" -- npm test',
        { timeout: 60000 },
        expect.any(Function)
      );
    });
  });

  describe('custom env file path', () => {
    it('uses custom env file path when specified', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'output', '');
      });

      await runWithSecrets.execute({
        command: 'node',
        args: ['script.js'],
        envFile: 'custom/.env'
      });

      expect(mockExec).toHaveBeenCalledWith(
        'op run --env-file="custom/.env" -- node script.js',
        { timeout: 60000 },
        expect.any(Function)
      );
    });
  });

  describe('stdout, stderr, and exitCode', () => {
    it('returns stdout, stderr, and exitCode for successful command', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'standard output', 'warning message');
      });

      const result = await runWithSecrets.execute({
        command: 'test',
        args: []
      });

      expect(result).toEqual({
        stdout: 'standard output',
        stderr: 'warning message',
        exitCode: 0
      });
    });
  });

  describe('command failure handling', () => {
    it('returns stdout, stderr, and non-zero exitCode when command fails', async () => {
      const mockError: any = new Error('Command failed');
      mockError.code = 1;
      mockError.stdout = 'partial output';
      mockError.stderr = 'error message';

      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(mockError, '', '');
      });

      const result = await runWithSecrets.execute({
        command: 'failing-command',
        args: []
      });

      expect(result).toEqual({
        stdout: 'partial output',
        stderr: 'error message',
        exitCode: 1
      });
    });

    it('defaults exitCode to 1 when error.code is missing', async () => {
      const mockError: any = new Error('Unknown error');
      mockError.stderr = 'something went wrong';

      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(mockError, '', '');
      });

      const result = await runWithSecrets.execute({
        command: 'test',
        args: []
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('something went wrong');
    });
  });

  describe('biometric timeout error', () => {
    it('throws OpClientError when biometric authentication is required', async () => {
      const mockError: any = new Error('Command failed');
      mockError.stderr = '1Password requires biometric authentication to continue';

      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(mockError, '', '');
      });

      await expect(
        runWithSecrets.execute({
          command: 'test',
          args: []
        })
      ).rejects.toThrow(OpClientError);

      await expect(
        runWithSecrets.execute({
          command: 'test',
          args: []
        })
      ).rejects.toThrow('Biometric authentication required');
    });

    it('throws OpClientError when authentication error occurs', async () => {
      const mockError: any = new Error('Command failed');
      mockError.stderr = 'authentication failed';

      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(mockError, '', '');
      });

      await expect(
        runWithSecrets.execute({
          command: 'test',
          args: []
        })
      ).rejects.toThrow(OpClientError);
    });

    it('throws OpClientError with AUTH_REQUIRED code', async () => {
      const mockError: any = new Error('Command failed');
      mockError.stderr = 'biometric unlock needed';

      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(mockError, '', '');
      });

      try {
        await runWithSecrets.execute({
          command: 'test',
          args: []
        });
        expect.fail('Should have thrown OpClientError');
      } catch (error) {
        expect(error).toBeInstanceOf(OpClientError);
        expect((error as OpClientError).code).toBe('AUTH_REQUIRED');
      }
    });
  });

  describe('shell injection protection', () => {
    it('rejects command with shell metacharacters', async () => {
      const unsafeCommands = [
        'echo;rm -rf /',
        'echo&whoami',
        'echo|cat /etc/passwd',
        'echo`whoami`',
        'echo$(whoami)',
        'test()'
      ];

      for (const command of unsafeCommands) {
        await expect(
          runWithSecrets.execute({ command, args: [] })
        ).rejects.toThrow('Command contains unsafe characters');
      }
    });

    it('rejects args with shell metacharacters', async () => {
      const unsafeArgs = [
        ['arg;rm -rf /'],
        ['arg&whoami'],
        ['arg|cat /etc/passwd'],
        ['arg`whoami`'],
        ['arg$(whoami)'],
        ['arg()']
      ];

      for (const args of unsafeArgs) {
        await expect(
          runWithSecrets.execute({ command: 'echo', args })
        ).rejects.toThrow('Argument contains unsafe characters');
      }
    });

    it('accepts safe command and args', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'output', '');
      });

      const safeCases = [
        { command: 'npm', args: ['test'] },
        { command: 'node', args: ['script.js', '--flag'] },
        { command: 'echo', args: ['hello', 'world'] },
        { command: 'ls', args: ['-la', '/tmp'] }
      ];

      for (const testCase of safeCases) {
        await expect(
          runWithSecrets.execute(testCase)
        ).resolves.toBeDefined();
      }
    });
  });
});
