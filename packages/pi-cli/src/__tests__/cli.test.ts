import { describe, test, expect, spyOn } from 'bun:test';
import { runCreate } from '../commands/create';
import { runList } from '../commands/list';

describe('CLI argument parsing (create)', () => {
  test('runCreate exits without project name', async () => {
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const mockLog = spyOn(console, 'log').mockImplementation(() => {});

    try {
      await runCreate([]);
    } catch (e: unknown) {
      expect((e as Error).message).toBe('process.exit');
    }

    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
    mockLog.mockRestore();
  });

  test('runCreate throws for invalid --type', async () => {
    expect(runCreate(['my-app', '--type', 'nonexistent'])).rejects.toThrow(
      'Unknown template type',
    );
  });

  test('runCreate shows usage in help output', async () => {
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const logs: string[] = [];
    const mockLog = spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });

    try {
      await runCreate([]);
    } catch {
      // expected
    }

    const output = logs.join('\n');
    expect(output).toContain('create-agent create');
    expect(output).toContain('--type');
    expect(output).toContain('--dir');

    mockExit.mockRestore();
    mockLog.mockRestore();
  });
});

describe('CLI argument parsing (list)', () => {
  test('runList outputs all template types', async () => {
    const logs: string[] = [];
    const mockLog = spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });

    await runList();

    const output = logs.join('\n');
    expect(output).toContain('general');
    expect(output).toContain('chat');
    expect(output).toContain('agent');
    expect(output).toContain('browser-agent');
    expect(output).toContain('cowork');
    expect(output).toContain('Available templates');

    mockLog.mockRestore();
  });
});

describe('CLI command registry', () => {
  test('all 4 commands are importable', async () => {
    const { runCreate } = await import('../commands/create');
    const { runList } = await import('../commands/list');
    const { runStatus } = await import('../commands/status');
    const { runWorkspace } = await import('../commands/workspace');

    expect(typeof runCreate).toBe('function');
    expect(typeof runList).toBe('function');
    expect(typeof runStatus).toBe('function');
    expect(typeof runWorkspace).toBe('function');
  });
});
