import fs from 'fs';
import path from 'path';

/**
 * Guards for the accessibility fixes, so they don't quietly come back:
 * one h1 per page, one main region, decorative bars hidden from screen
 * readers, a visible keyboard focus ring, and a page for unknown addresses.
 */
const SRC = __dirname;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__mocks__' ? [] : sourceFiles(full);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
  });

const read = (file: string) => fs.readFileSync(file, 'utf8');
const relative = (file: string) => path.relative(SRC, file);
const files = sourceFiles(path.join(SRC, 'components'));

describe('Accessibility guards', () => {
  it('the header has no h1, so each page has just its own', () => {
    expect(read(path.join(SRC, 'components/header/Header.tsx'))).not.toMatch(/<h1[\s>]/);
  });

  it('App has one main region and the skip link points at it', () => {
    const app = read(path.join(SRC, 'App.tsx'));
    expect(app.match(/<main[\s>]/g)).toHaveLength(1);
    expect(app).toMatch(/<main id="content"/);
    expect(app).toMatch(/href="#content"/);
  });

  it('no page adds a second main region', () => {
    expect(files.filter(file => /<main[\s>]/.test(read(file))).map(relative)).toEqual([]);
  });

  it('decorative bars are hidden from screen readers, never labelled', () => {
    expect(files.filter(file => /aria-label="[^"]*rectangle graphic/i.test(read(file))).map(relative)).toEqual([]);
  });

  it('unknown addresses get the Page Not Found page', () => {
    expect(read(path.join(SRC, 'App.tsx'))).toMatch(/<Route path="\*" element={<NotFound \/>} \/>/);
  });

  it('keyboard users get a visible focus ring despite the global reset', () => {
    const css = read(path.join(SRC, 'css/main.css'));
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline: 3px solid/);
  });
});