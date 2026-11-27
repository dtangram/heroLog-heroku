/// <reference types="jest" />
import axios from 'axios';
import comicVine, { normalizeSeries, pickCover } from '../comicVine';

const findCover = comicVine.find;

jest.mock('axios');
const mockGet = jest.mocked(axios.get);
// Telling Axios's own errors apart still works; only requests are faked
const actualAxios = jest.requireActual<typeof import('axios')>('axios');
jest.mocked(axios.isAxiosError).mockImplementation(actualAxios.isAxiosError);

const issue = (series: string, coverDate: string, url = `https://comicvine.gamespot.com/a/uploads/${series}-${coverDate}.jpg`) => ({
  issue_number: '497',
  cover_date: coverDate,
  image: { medium_url: url },
  volume: { name: series },
});

describe('pickCover', () => {
  it('picks the issue from the series and year asked for', () => {
    const issues = [issue('Batman', '1993-07-01'), issue('Batman: Shadow of the Bat', '1993-07-01')];

    expect(pickCover(issues, { series: 'Batman', issue: 497, year: 1993 })).toContain('Batman-1993');
  });

  it('gives up when several series share the name and there is no year to tell them apart', () => {
    const issues = [issue('Batman', '1993-07-01'), issue('Batman', '2011-05-01')];

    expect(pickCover(issues, { series: 'Batman', issue: 497 })).toBeNull();
  });

  it('ignores small differences in how the series is written', () => {
    expect(normalizeSeries('The Amazing Spider-Man')).toBe(normalizeSeries('amazing spider man'));
    expect(pickCover([issue('The Amazing Spider-Man', '1995-01-01')], { series: 'Amazing Spider-Man', issue: 396 })).not.toBeNull();
  });

  it("doesn't use Comic Vine's stand-in picture for a missing cover", () => {
    const blank = issue('Batman', '1993-07-01', 'https://comicvine.gamespot.com/a/uploads/scale_medium/img/blank.png');

    expect(pickCover([blank], { series: 'Batman', issue: 497, year: 1993 })).toBeNull();
  });
});

describe('Comic Vine lookup', () => {
  const original = process.env.COMIC_VINE_API_KEY;
  beforeEach(() => {
    mockGet.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.COMIC_VINE_API_KEY = original;
    jest.restoreAllMocks();
  });

  it('does nothing without an API key', async () => {
    delete process.env.COMIC_VINE_API_KEY;

    expect(comicVine.isAvailable()).toBe(false);
    expect(await findCover({ series: 'Batman', issue: 497, year: 1993 })).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('asks Comic Vine for that issue number in that year', async () => {
    process.env.COMIC_VINE_API_KEY = 'test-key';
    mockGet.mockResolvedValue({ data: { results: [issue('Batman', '1993-07-01')] } });

    const cover = await findCover({ series: 'Batman', issue: 497, year: 1993 });

    expect(cover).toContain('Batman-1993');
    expect(mockGet.mock.calls[0][1]?.params.filter).toBe('issue_number:497,cover_date:1993-01-01|1993-12-31');
    expect(mockGet.mock.calls[0][1]?.headers?.['User-Agent']).toMatch(/Hero-Log/);
  });

  it('treats a failed lookup as no cover, without logging the API key', async () => {
    process.env.COMIC_VINE_API_KEY = 'secret-key';
    const config = { url: 'https://comicvine.gamespot.com/api/issues/?api_key=secret-key', headers: new actualAxios.AxiosHeaders() };
    mockGet.mockRejectedValue(
      new actualAxios.AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
        data: {}, status: 429, statusText: 'Too Many Requests', headers: {}, config,
      })
    );

    expect(await findCover({ series: 'Batman', issue: 497 })).toBeNull();
    const logged = (console.warn as jest.Mock).mock.calls.flat().join(' ');
    expect(logged).toContain('429');
    expect(logged).not.toContain('secret-key');
  });

  it('explains in the logs why nothing matched', async () => {
    process.env.COMIC_VINE_API_KEY = 'test-key';
    mockGet.mockResolvedValue({ data: { results: [issue('Detective Comics', '1993-06-01'), issue('Detective Comics', '1993-07-01')] } });

    expect(await findCover({ series: 'Detective Comics', issue: 661, year: 1993 })).toBeNull();

    const logged = (console.log as jest.Mock).mock.calls.flat().join(' ');
    expect(logged).toContain('2 issue(s) numbered 661 from 1993, 2 in a series named "Detective Comics"');
  });
});