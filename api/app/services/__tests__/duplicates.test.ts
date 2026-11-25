import { matchIssue, matchPublisher, matchTitle, normalizeIssue, normalizePublisher, allowsDuplicate, duplicateMessage } from '../duplicates';

describe('duplicate publishers', () => {
  const rows = [
    { id: 'p1', publisherName: 'DC Comics' },
    { id: 'p2', publisherName: 'Dynamite' },
  ];

  it('treats "DC", "DC Comics" and "D.C. Comics, Inc." as the same publisher', () => {
    expect(normalizePublisher('DC')).toBe(normalizePublisher('DC Comics'));
    expect(normalizePublisher('D.C. Comics, Inc.')).toBe(normalizePublisher('dc'));
    expect(matchPublisher(rows, 'dc')).toEqual({ kind: 'publisher', id: 'p1', name: 'DC Comics', canSaveAnyway: false });
  });

  it('matches regardless of case and spacing', () => {
    expect(matchPublisher(rows, '  DYNAMITE ')?.id).toBe('p2');
  });

  it('does not match different publishers', () => {
    expect(matchPublisher(rows, 'Marvel')).toBeNull();
    expect(matchPublisher(rows, 'Dark Horse')).toBeNull();
  });

  it('ignores the publisher being renamed', () => {
    expect(matchPublisher(rows, 'DC Comics', 'p1')).toBeNull();
  });
});

describe('duplicate titles', () => {
  const rows = [{ id: 't1', cbTitle: 'Detective Comics' }];

  it('matches the same title under a publisher', () => {
    expect(matchTitle(rows, 'detective  comics')?.id).toBe('t1');
  });

  it('keeps "Comics" significant for titles', () => {
    expect(matchTitle(rows, 'Detective')).toBeNull();
  });
});

describe('duplicate issues', () => {
  const rows = [
    { id: 'i1', title: 'Detective Comics', comicIssue: '659', volume: '1', type: 'regular' },
    { id: 'i2', title: 'Detective Comics', comicIssue: '660', volume: null, type: 'variant' },
  ];

  it('treats "#0659" and "659" as the same issue', () => {
    expect(normalizeIssue('#0659')).toBe('659');
    expect(matchIssue(rows, { comicIssue: '#0659', type: 'regular' })).toEqual({
      kind: 'issue',
      id: 'i1',
      name: 'Detective Comics #659',
      canSaveAnyway: true,
    });
  });

  it('counts a blank volume as matching', () => {
    expect(matchIssue(rows, { comicIssue: '659', volume: '', type: 'regular' })?.id).toBe('i1');
  });

  it('keeps different volumes and cover types apart', () => {
    expect(matchIssue(rows, { comicIssue: '659', volume: '2', type: 'regular' })).toBeNull();
    expect(matchIssue(rows, { comicIssue: '659', type: 'variant' })).toBeNull();
    expect(matchIssue(rows, { comicIssue: '660', type: 'variant' })?.name).toBe('Detective Comics #660 (variant cover)');
  });

  it('ignores the issue being edited', () => {
    expect(matchIssue(rows, { comicIssue: '659', type: 'regular' }, 'i1')).toBeNull();
  });
});

describe('helpers', () => {
  it('only accepts an explicit allowDuplicate: true', () => {
    expect(allowsDuplicate({ allowDuplicate: true })).toBe(true);
    expect(allowsDuplicate({ allowDuplicate: 'true' })).toBe(false);
    expect(allowsDuplicate(undefined)).toBe(false);
  });

  it('says what already exists', () => {
    expect(duplicateMessage({ kind: 'publisher', id: 'p1', name: 'DC Comics', canSaveAnyway: false })).toBe(
      'You already have a publisher called DC Comics.'
    );
  });
});