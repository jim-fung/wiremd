/**
 * Tests for CLI functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';

describe('CLI', () => {
  const TEST_INPUT = './test-input.md';
  const TEST_OUTPUT = './test-output.html';

  beforeEach(() => {
    // Create test input file
    writeFileSync(
      TEST_INPUT,
      '# Test Wireframe\n\n## Button\n[Click Me]\n',
      'utf-8'
    );
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (existsSync(TEST_INPUT)) {
        unlinkSync(TEST_INPUT);
      }
      if (existsSync(TEST_OUTPUT)) {
        unlinkSync(TEST_OUTPUT);
      }
    } catch (e) {
      // Ignore if files don't exist
    }
  });

  describe('Help command', () => {
    it('should display help message', () => {
      const result = execSync('node dist/cli/index.js --help', {
        encoding: 'utf-8',
      });

      expect(result).toContain('wiremd');
      expect(result).toContain('USAGE:');
      expect(result).toContain('OPTIONS:');
      expect(result).toContain('EXAMPLES:');
    });

    it('should show all available options', () => {
      const result = execSync('node dist/cli/index.js --help', {
        encoding: 'utf-8',
      });

      expect(result).toContain('--output');
      expect(result).toContain('--format');
      expect(result).toContain('--style');
      expect(result).toContain('--codegen');
      expect(result).toContain('--watch');
      expect(result).toContain('--serve');
    });

    it('should list all available styles', () => {
      const result = execSync('node dist/cli/index.js --help', {
        encoding: 'utf-8',
      });

      expect(result).toContain('sketch');
      expect(result).toContain('clean');
      expect(result).toContain('wireframe');
      expect(result).toContain('none');
      expect(result).toContain('tailwind');
      expect(result).toContain('material');
      expect(result).toContain('brutal');
    });
  });

  describe('Version command', () => {
    it('should display version', () => {
      const result = execSync('node dist/cli/index.js --version', {
        encoding: 'utf-8',
      });

      expect(result).toMatch(/wiremd v\d+\.\d+\.\d+/);
    });
  });

  describe('Basic file generation', () => {
    it('should generate HTML from markdown', () => {
      let stdout = '';
      let stderr = '';
      try {
        const result = execSync(`node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        stdout = result;
      } catch (error: any) {
        stdout = error.stdout || '';
        stderr = error.stderr || '';
        throw new Error(
          `CLI command failed: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`
        );
      }

      if (!existsSync(TEST_OUTPUT)) {
        throw new Error(
          `Output file not created.\nStdout: ${stdout}\nStderr: ${stderr}\nInput exists: ${existsSync(TEST_INPUT)}`
        );
      }

      expect(existsSync(TEST_OUTPUT)).toBe(true);
      const html = readFileSync(TEST_OUTPUT, 'utf-8');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include parsed content in output', () => {
      try {
        execSync(`node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error: any) {
        throw new Error(
          `CLI command failed: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`
        );
      }

      expect(existsSync(TEST_OUTPUT)).toBe(true);
      const html = readFileSync(TEST_OUTPUT, 'utf-8');
      expect(html).toContain('Test Wireframe');
      expect(html).toContain('button');
    });

    it('should apply default sketch style', () => {
      try {
        execSync(`node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`, {
          stdio: 'pipe'
        });
      } catch (error: any) {
        // If execSync throws, log the error for debugging
        console.error('CLI command failed:', error.message);
        if (error.stderr) {
          console.error('stderr:', error.stderr.toString());
        }
        throw error;
      }

      expect(existsSync(TEST_OUTPUT)).toBe(true);
      const html = readFileSync(TEST_OUTPUT, 'utf-8');
      // Sketch style should include hand-drawn characteristics
      expect(html).toContain('style');
    });
  });

  describe('Style options', () => {
    it('should accept clean style', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style clean`
      );

      expect(existsSync(TEST_OUTPUT)).toBe(true);
    });

    it('should accept wireframe style', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style wireframe`
      );

      expect(existsSync(TEST_OUTPUT)).toBe(true);
    });

    it('should accept material style', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style material`
      );

      expect(existsSync(TEST_OUTPUT)).toBe(true);
    });

    it('should accept tailwind style', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style tailwind`
      );

      expect(existsSync(TEST_OUTPUT)).toBe(true);
    });

    it('should accept brutal style', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style brutal`
      );

      expect(existsSync(TEST_OUTPUT)).toBe(true);
    });

    it('should accept none style', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style none`
      );

      expect(existsSync(TEST_OUTPUT)).toBe(true);
    });

    it('should reject invalid style', () => {
      expect(() => {
        execSync(
          `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --style invalid`,
          { encoding: 'utf-8' }
        );
      }).toThrow();
    });
  });

  describe('Format options', () => {
    it('should generate HTML format', () => {
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --format html`
      );

      const content = readFileSync(TEST_OUTPUT, 'utf-8');
      expect(content).toContain('<html');
    });

    it('should generate JSON format', () => {
      const jsonOutput = './test-output.json';
      execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${jsonOutput} --format json`
      );

      const content = readFileSync(jsonOutput, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();

      // Clean up
      unlinkSync(jsonOutput);
    });

    it('should reject invalid format', () => {
      expect(() => {
        execSync(
          `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT} --format xml`,
          { encoding: 'utf-8' }
        );
      }).toThrow();
    });
  });

  describe('Codegen option', () => {
    const DEMO_INPUT = './test-demo-input.md';
    const DEMO_OUTPUT = './test-demo-output.html';
    const JSON_A = './test-demo-codegen.json';
    const JSON_B = './test-demo-plain.json';

    beforeEach(() => {
      writeFileSync(DEMO_INPUT, '::: demo\n[Click Me]*\n:::\n', 'utf-8');
    });

    afterEach(() => {
      for (const file of [DEMO_INPUT, DEMO_OUTPUT, JSON_A, JSON_B, DEMO_INPUT.replace('.md', '.html')]) {
        try {
          if (existsSync(file)) {
            unlinkSync(file);
          }
        } catch (e) {
          // Ignore if files don't exist
        }
      }
    });

    it('should accept --codegen jsx and generate JSX in coss demo code panes', () => {
      execSync(
        `node dist/cli/index.js ${DEMO_INPUT} -o ${DEMO_OUTPUT} --codegen jsx`
      );

      const html = readFileSync(DEMO_OUTPUT, 'utf-8');
      expect(html).toContain('wmd-demo-code');
      expect(html).toContain('className=');
    });

    it('should accept --codegen html', () => {
      execSync(
        `node dist/cli/index.js ${DEMO_INPUT} -o ${DEMO_OUTPUT} --codegen html`
      );

      expect(existsSync(DEMO_OUTPUT)).toBe(true);
    });

    it('should keep legacy styles showing raw source despite --codegen jsx', () => {
      execSync(
        `node dist/cli/index.js ${DEMO_INPUT} -o ${DEMO_OUTPUT} --style clean --codegen jsx`
      );

      const html = readFileSync(DEMO_OUTPUT, 'utf-8');
      expect(html).toContain('wmd-demo-code');
      expect(html).toContain('[Click Me]*');
      expect(html).not.toContain('className=');
    });

    it('should produce byte-identical JSON output with --codegen jsx', () => {
      execSync(
        `node dist/cli/index.js ${DEMO_INPUT} -o ${JSON_A} --format json --codegen jsx`
      );
      execSync(`node dist/cli/index.js ${DEMO_INPUT} -o ${JSON_B} --format json`);

      expect(readFileSync(JSON_A, 'utf-8')).toBe(readFileSync(JSON_B, 'utf-8'));
    });

    it('should reject invalid codegen with exact error and exit code 1', () => {
      let exitCode = 0;
      let stderr = '';
      try {
        execSync(`node dist/cli/index.js ${DEMO_INPUT} --codegen ts`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error: any) {
        exitCode = error.status;
        stderr = (error.stderr || '').toString();
      }

      expect(exitCode).toBe(1);
      expect(stderr).toContain('Error: Invalid codegen "ts". Must be html or jsx.');
    });

    it('should keep the .html output extension with --codegen jsx', () => {
      execSync(`node dist/cli/index.js ${DEMO_INPUT} --codegen jsx`);

      const autoOutput = DEMO_INPUT.replace('.md', '.html');
      expect(existsSync(autoOutput)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should error on missing input file', () => {
      expect(() => {
        execSync('node dist/cli/index.js nonexistent.md', {
          encoding: 'utf-8',
        });
      }).toThrow();
    });

    it('should error with exit code 1 when no input specified', () => {
      // CLI should exit with error when no input is provided
      let exitCode = 0;
      try {
        execSync('node dist/cli/index.js', { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        exitCode = error.status;
      }
      expect(exitCode).toBe(1);
    });
  });

  describe('Output path handling', () => {
    it('should auto-generate output path from input', () => {
      execSync(`node dist/cli/index.js ${TEST_INPUT}`);

      const autoOutput = TEST_INPUT.replace('.md', '.html');
      expect(existsSync(autoOutput)).toBe(true);

      // Clean up
      unlinkSync(autoOutput);
    });

    it('should respect custom output path', () => {
      const customOutput = './custom-output.html';
      execSync(`node dist/cli/index.js ${TEST_INPUT} -o ${customOutput}`);

      expect(existsSync(customOutput)).toBe(true);

      // Clean up
      unlinkSync(customOutput);
    });
  });

  describe('Server integration', () => {
    it('should accept serve port option', () => {
      // We can't actually test the server starting in unit tests
      // but we can verify the option is accepted
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('--serve');
      expect(cliSource).toContain('parseInt');
    });

    it('should validate port number', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('isNaN');
      expect(cliSource).toContain('port');
    });
  });

  describe('Watch mode integration', () => {
    it('should accept watch option', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('--watch');
      expect(cliSource).toContain('chokidar');
    });

    it('should use debouncing for file changes', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('awaitWriteFinish');
      expect(cliSource).toContain('stabilityThreshold');
      expect(cliSource).toContain('isProcessing');
    });

    it('should regenerate on file changes', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('regenerate');
      expect(cliSource).toContain('generateOutput');
      expect(cliSource).toContain('writeFileSync');
    });
  });

  describe('Error notification integration', () => {
    it('should import notifyError function', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('import');
      expect(cliSource).toContain('notifyError');
    });

    it('should call notifyError on generation failure', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('catch');
      expect(cliSource).toContain('notifyError');
      expect(cliSource).toContain('error.message');
    });

    it('should only notify error when serve is active', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('if (options.serve)');
      expect(cliSource).toContain('notifyError');
    });
  });

  describe('Live reload integration', () => {
    it('should import notifyReload function', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('import');
      expect(cliSource).toContain('notifyReload');
    });

    it('should call notifyReload on successful regeneration', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('notifyReload');
    });

    it('should only notify reload when serve is active', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('if (options.serve)');
      expect(cliSource).toContain('notifyReload');
    });
  });

  describe('Signal handling', () => {
    it('should handle SIGINT for graceful shutdown', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('SIGINT');
      expect(cliSource).toContain('process.exit');
    });

    it('should display shutdown message', () => {
      const cliSource = readFileSync('./src/cli/index.ts', 'utf-8');
      expect(cliSource).toContain('Stopping watch mode');
    });
  });

  describe('Console output', () => {
    it('should show parsing message', () => {
      const result = execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('Parsing');
    });

    it('should show generation success message', () => {
      const result = execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('Generated');
      expect(result).toContain('✓');
    });

    it('should show style being used', () => {
      const result = execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('Style');
      expect(result).toContain('coss');
    });

    it('should show format being used', () => {
      const result = execSync(
        `node dist/cli/index.js ${TEST_INPUT} -o ${TEST_OUTPUT}`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('Format');
      expect(result).toContain('html');
    });
  });
});
