/// <reference types="jest" />
import { findCover } from '..';
import type { CoverSource } from '..';

const source = (name: string, cover: string | null | Error, available = true): CoverSource & { find: jest.Mock } => ({
  name,
  isAvailable: () => available,
  find: jest.fn(async () => {
    if (cover instanceof Error) throw cover;
    return cover;
  }),
});

const batman = { series: 'Batman', issue: 497, year: 1993 };

describe('findCover across sources', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('uses the first source that finds a cover', async () => {
    const first = source('First', null);
    const second = source('Second', 'https://second.example/batman-497.jpg');
    const third = source('Third', 'https://third.example/batman-497.jpg');

    expect(await findCover(batman, [first, second, third])).toBe('https://second.example/batman-497.jpg');
    expect(third.find).not.toHaveBeenCalled();
  });

  it("skips a source that isn't set up", async () => {
    const notSetUp = source('Not set up', 'https://never.example/x.jpg', false);
    const working = source('Working', 'https://working.example/batman-497.jpg');

    expect(await findCover(batman, [notSetUp, working])).toBe('https://working.example/batman-497.jpg');
    expect(notSetUp.find).not.toHaveBeenCalled();
  });

  it('keeps going when a source fails', async () => {
    const failing = source('Failing', new Error('Service down'));
    const working = source('Working', 'https://working.example/batman-497.jpg');

    expect(await findCover(batman, [failing, working])).toBe('https://working.example/batman-497.jpg');
  });

  it('finds nothing when no source has the cover', async () => {
    expect(await findCover(batman, [source('Empty', null)])).toBeNull();
  });
});