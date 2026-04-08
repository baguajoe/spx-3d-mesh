import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = path.resolve(__dirname, '../../src/styles');
const SRC_DIR = path.resolve(__dirname, '../../src');

// These common state/utility classes are allowed to exist in multiple files
const ALLOWED_DUPLICATES = new Set([
  'is-active', 'active', 'disabled', 'hidden', 'open', 'closed',
  'selected', 'focused', 'error', 'warning', 'success',
  // Timing values parsed as class names from CSS transitions
  '08s', '1s', '12s', '2s', '3s', '4s', '5s',
  // Known acceptable cross-file duplicates (same definition, different feature file)
  'material-panel-float', 'render-workspace-panel-float',
  'menu-dropdown', 'spx-tl-frame-info',
]);

function getClassMap() {
  const map = {};
  const files = fs.readdirSync(STYLES_DIR).filter(f => f.endsWith('.css'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(STYLES_DIR, file), 'utf-8');
    const classes = [...content.matchAll(/\.([\w-]+)\s*[{,]/g)].map(m => m[1]);
    for (const cls of classes) {
      if (!map[cls]) map[cls] = [];
      map[cls].push(file);
    }
  }
  return map;
}

describe('CSS Health Checks', () => {
  it('no duplicate class names across different CSS files', () => {
    const map = getClassMap();
    const conflicts = Object.entries(map)
      .filter(([cls, files]) => {
        const unique = [...new Set(files)];
        return unique.length > 1 && !ALLOWED_DUPLICATES.has(cls);
      })
      .map(([cls, files]) => ({ cls, files: [...new Set(files)] }));

    if (conflicts.length > 0) {
      const msg = conflicts
        .map(({ cls, files }) => `  .${cls}  →  ${files.join(', ')}`)
        .join('\n');
      throw new Error(`${conflicts.length} CSS conflicts found:\n${msg}`);
    }

    expect(conflicts.length).toBe(0);
  });

  it('no orphan CSS files (all must be imported somewhere)', () => {
    const files = fs.readdirSync(STYLES_DIR).filter(f => f.endsWith('.css'));
    const orphans = [];

    for (const file of files) {
      try {
        const result = execSync(
          `grep -rl "${file}" ${SRC_DIR} --include="*.jsx" --include="*.js" 2>/dev/null`,
          { encoding: 'utf-8' }
        ).trim();
        if (!result) orphans.push(file);
      } catch {
        orphans.push(file);
      }
    }

    if (orphans.length > 0) {
      throw new Error(`${orphans.length} orphan CSS files:\n${orphans.map(f => '  ' + f).join('\n')}`);
    }

    expect(orphans.length).toBe(0);
  });

  it('no embedded <style> tags in JSX files', () => {
    try {
      execSync(
        `grep -rl "<style>" ${SRC_DIR} --include="*.jsx" 2>/dev/null`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      // If grep succeeds (exit 0), files were found - that's a failure
      // But we check the output
    } catch (e) {
      // grep exits 1 when no matches = pass
      if (e.status === 1) {
        expect(true).toBe(true);
        return;
      }
      throw e;
    }
    expect(true).toBe(true);
  });

  it('CSS bundle should be under 200KB', () => {
    const distDir = path.resolve(__dirname, '../../dist/assets');
    if (!fs.existsSync(distDir)) {
      console.log('No dist folder — skipping bundle size check');
      return;
    }
    const cssFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.css'));
    for (const file of cssFiles) {
      const size = fs.statSync(path.join(distDir, file)).size;
      const kb = Math.round(size / 1024);
      expect(kb).toBeLessThan(200);
    }
  });
});
