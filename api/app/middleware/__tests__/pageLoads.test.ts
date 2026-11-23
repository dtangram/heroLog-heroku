/// <reference types="jest" />
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { servePageLoads } from '../pageLoads';

// A React build with just an index.html
const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herolog-build-'));
const indexFile = path.join(buildDir, 'index.html');
fs.writeFileSync(indexFile, '<!doctype html><title>Hero-Log</title><div id="root"></div>');

/** Like the real server: an API route that needs sign-in, at the same path as a page */
const makeApp = (index: string | null = indexFile) => {
  const app = express();
  app.use(servePageLoads(() => index));
  app.get('/wishlist/:id', (_req, res) => { res.status(401).json({ success: false, error: 'Please sign in to continue.' }); });
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/search/search/:id', (_req, res) => { res.json({ results: [] }); });
  app.use(express.static(buildDir));
  return app;
};

const USER = '617a8f57-ece6-44df-b59a-74fe4e6bac3d';

describe('page loads', () => {
  it('refreshing the Wish List page gets the app, not the API', async () => {
    const res = await request(makeApp())
      .get(`/wishlist/${USER}`)
      .set('Sec-Fetch-Mode', 'navigate')
      .set('Accept', 'text/html,application/xhtml+xml,*/*;q=0.8');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
  });

  it("the app's own data request still reaches the API", async () => {
    const res = await request(makeApp())
      .get(`/wishlist/${USER}`)
      .set('Sec-Fetch-Mode', 'cors')
      .set('Accept', 'application/json, text/plain, */*');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Please sign in to continue.');
  });

  it('works in older browsers without Sec-Fetch headers', async () => {
    const page = await request(makeApp()).get(`/wishlist/${USER}`).set('Accept', 'text/html');
    const data = await request(makeApp()).get(`/wishlist/${USER}`).set('Accept', 'application/json');

    expect(page.text).toContain('<div id="root">');
    expect(data.status).toBe(401);
  });

  it('leaves /api, /health and real files alone, even when opened in a browser', async () => {
    const browser = (url: string) => request(makeApp()).get(url).set('Sec-Fetch-Mode', 'navigate').set('Accept', 'text/html');

    expect((await browser(`/api/search/search/${USER}`)).body).toEqual({ results: [] });
    expect((await browser('/health')).body).toEqual({ status: 'ok' });
    expect((await browser('/index.html')).status).toBe(200);
  });

  it('does nothing without a React build (development)', async () => {
    const res = await request(makeApp(null)).get(`/wishlist/${USER}`).set('Sec-Fetch-Mode', 'navigate');

    expect(res.status).toBe(401);
  });

  it('only answers GET requests', async () => {
    const res = await request(makeApp()).post(`/wishlist/${USER}`).set('Sec-Fetch-Mode', 'navigate');

    expect(res.status).toBe(404);
  });
});