/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { API_PREFIX, LEGACY_ROOT_ROUTES } from '../apiRoutes';

/**
 * Guards against the Wish List refresh bug coming back: an API route at the
 * same address as a page in the React app. Every API route must be under /api.
 */
const server = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8')
  // Comments don't mount anything
  .replace(/\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Addresses the server file mounts directly, e.g. app.use('/wishlist', …) */
const literalMounts = [...server.matchAll(/app\.(?:use|get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/g)]
  .map(match => match[1]);

/** The API route table in index.ts */
const tableRoutes = [...server.matchAll(/\[\s*'([^']+)'\s*,\s*\w+\s*\]/g)].map(match => match[1]);

describe('API routes', () => {
  it('are all mounted under /api, through the route table', () => {
    expect(API_PREFIX).toBe('/api');
    expect(server).toMatch(/app\.use\(`\$\{API_PREFIX\}\$\{routePath\}`, router\)/);
  });

  it("aren't mounted anywhere else, apart from the health check and the React app", () => {
    const allowed = ['/health', '*', '${API_PREFIX}${routePath}'];
    expect(literalMounts.filter(mount => !allowed.includes(mount))).toEqual([]);
  });

  it("don't repeat the /api prefix in the table", () => {
    expect(tableRoutes.length).toBeGreaterThan(0);
    expect(tableRoutes.filter(route => route.startsWith('/api'))).toEqual([]);
  });

  it('keep old addresses only for routes that had them, and that list only shrinks', () => {
    const originallyAtRoot = [
      '/collectpub', '/comicbooktitles', '/comicbook', '/messaging', '/salelist',
      '/salelistALL', '/wishlist', '/users', '/auth', '/emailpasswordreset', '/s3',
    ];
    LEGACY_ROOT_ROUTES.forEach(route => {
      expect(originallyAtRoot).toContain(route);
      expect(tableRoutes).toContain(route);
    });
  });
});