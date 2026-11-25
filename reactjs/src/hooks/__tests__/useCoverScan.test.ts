import { scanMessage, unreadFields } from '../useCoverScan';
import type { ScanResult } from '../useComicScanner';

const scan = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  title: 'Detective Comics',
  comicIssue: '659',
  comicBookVolume: '1',
  comicBookYear: '1993',
  comicBookPublisher: 'DC Comics',
  author: 'Chuck Dixon',
  penciler: 'Graham Nolan',
  inker: 'Scott Hanna',
  coverartist: 'Kelley Jones',
  type: 'Regular',
  confidence: 0.85,
  ...overrides,
});

describe('scan message', () => {
  it('just asks for a check when everything was read', () => {
    expect(scanMessage(scan(), ['title', 'issue', 'writer'])).toBe(
      'Cover scanned (85% confidence). Please check the filled-in fields.'
    );
  });

  it('names the fields the scan left blank', () => {
    const result = scan({ author: '', penciler: undefined });
    expect(unreadFields(result, ['title', 'writer', 'penciler', 'coverArtist'])).toEqual(['writer', 'penciler']);
    expect(scanMessage(result, ['title', 'writer', 'penciler', 'coverArtist'])).toBe(
      "Cover scanned (85% confidence). It couldn't read the writer or penciler, so please fill those in and check the rest."
    );
  });

  it('only checks the fields the form has', () => {
    expect(scanMessage(scan({ author: '' }), ['title', 'issue', 'publisher'])).toBe(
      'Cover scanned (85% confidence). Please check the filled-in fields.'
    );
  });

  it('lists three or more with commas', () => {
    expect(scanMessage(scan({ author: '', penciler: '', inker: '' }), ['writer', 'penciler', 'inker'])).toContain(
      'the writer, penciler or inker, so please fill those in'
    );
  });
});