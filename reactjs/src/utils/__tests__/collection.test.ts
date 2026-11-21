import { countLabel, issueRange } from '../collection';

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