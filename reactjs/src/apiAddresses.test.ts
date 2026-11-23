import fs from 'fs';
import path from 'path';
import { API_URL } from './API';

/**
 * Guards against pages and the API sharing an address again (the Wish List
 * refresh bug). The server keeps every API route under /api; the app's pages
 * must stay out of it, and calls must not add the prefix a second time.
 */
const SRC = __dirname;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__mocks__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

describe('API addresses', () => {
  it('the API client points at /api on the server', () => {
    expect(API_URL).toMatch(/\/api$/);
  });

  it('no page in the app has an address under /api', () => {
    const app = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    const pages = [...app.matchAll(/path="([^"]+)"/g)].map(match => match[1]);

    expect(pages.length).toBeGreaterThan(0);
    expect(pages.filter(page => /^\/api(\/|$)/.test(page))).toEqual([]);
  });

  it("no call adds /api itself (the API client already does)", () => {
    const doubled = sourceFiles(SRC).flatMap(file => {
      const code = fs.readFileSync(file, 'utf8');
      const calls = [
        ...code.matchAll(/API\.(?:get|post|put|patch|delete)(?:<[^>]*>)?\(\s*['"`]\/?api\//g),
        ...code.matchAll(/\$\{API_URL\}\/api\//g),
      ];
      return calls.map(() => path.relative(SRC, file));
    });

    expect(doubled).toEqual([]);
  });
});