import { comicsOf, countLabel, issueRange, matchPublisherName, splitEmpty } from '../collection';

describe('countLabel', () => {
  it.each([
    [0, 'title', '0 titles'],
    [1, 'title', '1 title'],
    [4, 'title', '4 titles'],
    [1250, 'issue', '1,250 issues'],
    [undefined, 'issue', '0 issues'],
  ])('shows %p %s as %p', (count, word, expected) => {
    expect(countLabel(count as number | undefined, word)).toBe(expected);
  });
});

describe('issueRange', () => {
  it('shows the lowest and highest issue numbers', () => {
    expect(issueRange(401, 497)).toBe('#401–#497');
  });

  it('shows one number when there is only one', () => {
    expect(issueRange(27, 27)).toBe('#27');
  });

  it('shows nothing when no issue numbers are known', () => {
    expect(issueRange(null, null)).toBeNull();
  });
});
describe('comicsOf', () => {
  it('adds "Comics" to a title that does not end with it', () => {
    expect(comicsOf('Batman')).toBe('Batman Comics');
  });

  it('does not double it for titles that already end in Comic or Comics', () => {
    expect(comicsOf('Detective Comics')).toBe('Detective Comics');
    expect(comicsOf('Action Comics ')).toBe('Action Comics');
    expect(comicsOf('Marvel Comic')).toBe('Marvel Comic');
  });

  it('only checks the last word', () => {
    expect(comicsOf('Comics Greatest World')).toBe('Comics Greatest World Comics');
  });
});

describe('splitEmpty', () => {
  const titles = [
    { name: 'Batman', issueCount: 12 },
    { name: 'Aquaman', issueCount: 0 },
  ];

  it('puts empty items in their own list when others have contents', () => {
    expect(splitEmpty(titles, title => title.issueCount > 0)).toEqual({ cards: [titles[0]], empty: [titles[1]] });
  });

  it('keeps everything as cards when nothing has contents yet', () => {
    expect(splitEmpty([titles[1]], title => title.issueCount > 0)).toEqual({ cards: [titles[1]], empty: [] });
  });
});

describe('matchPublisherName', () => {
  const known = ['DC Comics', 'Marvel', 'Dark Horse Comics'];

  it("uses the collection's spelling for a publisher it already has", () => {
    expect(matchPublisherName('DC', known)).toBe('DC Comics');
    expect(matchPublisherName('marvel comics', known)).toBe('Marvel');
    expect(matchPublisherName(' dark horse ', known)).toBe('Dark Horse Comics');
  });

  it('keeps a new publisher as typed', () => {
    expect(matchPublisherName(' Image Comics ', known)).toBe('Image Comics');
  });
});