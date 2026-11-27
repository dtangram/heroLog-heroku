import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import callAPI from '../helpers/callAPIMiddleware';
import wishlists from './reducer';
import API from '../../API';
import { addToWishlist } from './actions';
import { COVER_CHECKS_MS } from '../../constants/covers';

jest.mock('../../API');
// The tests' global uuid stand-in returns nothing; give each added comic a real ID
jest.mock('uuid', () => ({ v4: () => 'wish-detective-662' }));

const USER = '11111111-2222-4333-8444-555555555555';
const COVER = 'https://comicvine.gamespot.com/a/uploads/scale_medium/detective-662.jpg';

const detective662 = {
  comicBookTitle: 'Detective Comics',
  comicIssue: '662',
  comicBookVolume: '',
  comicBookYear: '1993',
  comicBookPublisher: 'DC Comics',
  comicBookCover: '',
  type: 'regular',
};

const setup = () =>
  createStore(combineReducers({ wishlists }), applyMiddleware(thunk, callAPI as any));

/** The added comic's cover, as the Wish List page would show it */
const coverIn = (store: ReturnType<typeof setup>): string => {
  const list = (store.getState() as any).wishlists[USER];
  const id = list.allIds[0];
  return list.byId[id].data.comicBookCover;
};

/** Lets timers and the API calls they start finish */
const advance = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

describe('a comic added without a cover', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.setItem('id', USER);
    (API.post as jest.Mock).mockReset().mockResolvedValue({ success: true, data: { id: 'ignored' } });
    (API.get as jest.Mock).mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('gets the cover the server found a few seconds later, without a reload', async () => {
    const store = setup();
    // Like the live site: the cover is saved about 3 seconds after the add
    (API.get as jest.Mock).mockImplementation(async (url: string) => ({
      success: true,
      data: { ...detective662, id: url.split('/').pop(), comicBookCover: COVER, wishUsersId: USER },
    }));

    await store.dispatch(addToWishlist(detective662) as any);
    expect(coverIn(store)).toBe('');

    await advance(COVER_CHECKS_MS[0]);

    expect(API.get).toHaveBeenCalledTimes(1);
    expect(coverIn(store)).toBe(COVER);

    // Already has its cover: no second check
    await advance(COVER_CHECKS_MS[1]);
    expect(API.get).toHaveBeenCalledTimes(1);
  });

  it('checks again later when the cover is still being looked up', async () => {
    const store = setup();
    (API.get as jest.Mock)
      .mockImplementationOnce(async (url: string) => ({ success: true, data: { ...detective662, id: url.split('/').pop(), wishUsersId: USER } }))
      .mockImplementationOnce(async (url: string) => ({ success: true, data: { ...detective662, id: url.split('/').pop(), comicBookCover: COVER, wishUsersId: USER } }));

    await store.dispatch(addToWishlist(detective662) as any);
    await advance(COVER_CHECKS_MS[0]);
    expect(coverIn(store)).toBe('');

    await advance(COVER_CHECKS_MS[1] - COVER_CHECKS_MS[0]);
    expect(API.get).toHaveBeenCalledTimes(2);
    expect(coverIn(store)).toBe(COVER);
  });

  it("doesn't check back when the comic was added with its own cover", async () => {
    const store = setup();

    await store.dispatch(addToWishlist({ ...detective662, comicBookCover: 'https://my-bucket.example/662.jpg' }) as any);
    await advance(COVER_CHECKS_MS[1]);

    expect(API.get).not.toHaveBeenCalled();
  });
});