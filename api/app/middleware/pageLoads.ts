import { NextFunction, Request, Response } from 'express';

/** Addresses that keep going to the server even when opened in a browser */
const SERVER_ONLY = [/^\/api\//, /^\/health\/?$/];

/** A real file, such as /manifest.json or /static/js/main.js */
const FILE = /\.[a-z0-9]+$/i;

export const isPageLoad = (req: Request): boolean => {
  if (req.method !== 'GET') return false;
  if (FILE.test(req.path) || SERVER_ONLY.some(pattern => pattern.test(req.path))) return false;

  const mode = req.get('sec-fetch-mode');
  if (mode) return mode === 'navigate';

  // Older browsers without Sec-Fetch headers: a page load asks for HTML
  return /text\/html/i.test(req.get('accept') ?? '');
};

export const servePageLoads = (getIndexFile: () => string | null) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const indexFile = getIndexFile();
    if (indexFile && isPageLoad(req)) {
      res.sendFile(indexFile);
      return;
    }
    next();
  };