import { describe, it } from 'vitest';
import assert from 'node:assert';
import { resolveDocDir } from '../src/docResolver.js';

describe('docResolver', () => {
  it('returns GODOT_DOC_DIR when set and valid', async () => {
    const result = await resolveDocDir({
      godotDocDir: './doc',
      cacheDir: './.cache',
    });
    assert.strictEqual(result.source, 'env');
    assert.strictEqual(result.docDir, './doc');
    assert.strictEqual(result.godotVersion, undefined);
  });

  it('throws when GODOT_DOC_DIR is set but has no classes/ subdirectory', async () => {
    await assert.rejects(
      () => resolveDocDir({
        godotDocDir: './server',
        cacheDir: './.cache',
      }),
      (err: Error) => {
        assert.ok(err.message.includes('no classes/ subdirectory'));
        return true;
      },
    );
  });

  it('throws when GODOT_DOC_DIR does not exist', async () => {
    await assert.rejects(
      () => resolveDocDir({
        godotDocDir: './nonexistent-dir-xyz',
        cacheDir: './.cache',
      }),
      (err: Error) => {
        assert.ok(err.message.includes('does not exist'));
        return true;
      },
    );
  });

  it('throws clear error when no Godot found', async () => {
    const failExec = async () => {
      throw new Error('not found');
    };
    await assert.rejects(
      () => resolveDocDir({
        cacheDir: './.cache',
        execGodot: failExec,
      }),
      (err: Error) => {
        assert.ok(err.message.includes('Could not find Godot docs'));
        assert.ok(err.message.includes('GODOT_BIN'));
        assert.ok(err.message.includes('GODOT_DOC_DIR'));
        return true;
      },
    );
  });

  it('calls execGodot with correct args when GODOT_BIN is set', async () => {
    const calls: Array<{ bin: string; args: string[] }> = [];
    const mockExec = async (bin: string, args: string[]) => {
      calls.push({ bin, args });
      if (args[0] === '--version') {
        return { stdout: '4.3.stable\n', stderr: '' };
      }
      // --doctool call: simulate creating classes dir
      const fs = await import('node:fs');
      const path = await import('node:path');
      // args[1] is the target dir
      const classesDir = path.default.join(args[1], 'classes');
      fs.mkdirSync(classesDir, { recursive: true });
      // Write a dummy file so it looks populated
      fs.writeFileSync(path.default.join(classesDir, 'Node.xml'), '<class name="Node"/>');
      return { stdout: '', stderr: '' };
    };

    const tmpDir = './test-cache-tmp';
    const fs = await import('node:fs');
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      const result = await resolveDocDir({
        godotBin: '/usr/local/bin/godot4',
        cacheDir: tmpDir,
        execGodot: mockExec,
      });

      // Should have called --version first
      assert.strictEqual(calls[0].bin, '/usr/local/bin/godot4');
      assert.deepStrictEqual(calls[0].args, ['--version']);

      // Should have called --doctool with --headless
      assert.strictEqual(calls[1].bin, '/usr/local/bin/godot4');
      assert.strictEqual(calls[1].args[0], '--doctool');
      assert.ok(calls[1].args.includes('--headless'));

      assert.strictEqual(result.source, 'extracted');
      assert.strictEqual(result.godotVersion, '4.3.stable');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('uses cache when version matches', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const tmpDir = './test-cache-tmp2';

    try {
      // Pre-populate cache
      const cachedDir = path.default.join(tmpDir, 'godot-4.3.stable');
      const classesDir = path.default.join(cachedDir, 'classes');
      fs.mkdirSync(classesDir, { recursive: true });
      fs.writeFileSync(path.default.join(classesDir, 'Node.xml'), '<class name="Node"/>');
      fs.writeFileSync(path.default.join(cachedDir, '.godot-version'), '4.3.stable');

      const calls: Array<{ bin: string; args: string[] }> = [];
      const mockExec = async (bin: string, args: string[]) => {
        calls.push({ bin, args });
        if (args[0] === '--version') {
          return { stdout: '4.3.stable\n', stderr: '' };
        }
        throw new Error('should not call doctool');
      };

      const result = await resolveDocDir({
        godotBin: '/usr/local/bin/godot4',
        cacheDir: tmpDir,
        execGodot: mockExec,
      });

      assert.strictEqual(result.source, 'cache');
      assert.strictEqual(result.godotVersion, '4.3.stable');
      // Should only have called --version, not --doctool
      assert.strictEqual(calls.length, 1);
      assert.deepStrictEqual(calls[0].args, ['--version']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
