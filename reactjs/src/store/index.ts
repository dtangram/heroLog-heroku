import {
  combineReducers,
  legacy_createStore as createStore,
  applyMiddleware,
  compose,
} from 'redux';
import { thunk } from 'redux-thunk';
import { createLogger } from 'redux-logger';
import callAPI from './helpers/callAPIMiddleware';
import publishers from './dashboard/reducer';
import comicbooklists from './comicbooklist/reducer';
import comicbooklistissues from './comicbooklistissues/reducer';
import messagings from './messagings/reducer';
import sales from './sale/reducer';
import salesALL from './saleALL/reducer';
import signups from './signup/reducer';
import signins from './signin/reducer';
import emailpasswordresets from './emailpasswordreset/reducer';
import passwordresets from './passwordreset/reducer';
import wishlists from './wishlist/reducer';
import userProfile from './user/reducer';

// Import state types from reducers
import type { UsersState } from './signup/reducer';
import type { SalesState } from './sale/reducer';

// Type for Redux DevTools extension
interface WindowWithDevTools extends Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
}

declare const window: WindowWithDevTools;

// Combine reducers
const rootReducer = combineReducers({
  publishers,
  comicbooklists,
  comicbooklistissues,
  messagings,
  sales,
  salesALL,
  signups,
  signins,
  emailpasswordresets,
  passwordresets,
  wishlists,
  userProfile,
});

// Define RootState type
export interface RootState {
  publishers: ReturnType<typeof publishers>;
  comicbooklists: ReturnType<typeof comicbooklists>;
  comicbooklistissues: ReturnType<typeof comicbooklistissues>;
  messagings: ReturnType<typeof messagings>;
  sales: SalesState;
  salesALL: ReturnType<typeof salesALL>;
  signups: UsersState;
  signins: ReturnType<typeof signins>;
  emailpasswordresets: ReturnType<typeof emailpasswordresets>;
  passwordresets: ReturnType<typeof passwordresets>;
  wishlists: ReturnType<typeof wishlists>;
  userProfile: ReturnType<typeof userProfile>;
}

// Configure middleware
const isDevelopment = process.env.NODE_ENV === 'development';

const middlewares = [thunk, callAPI];

// Only add logger in development
if (isDevelopment) {
  middlewares.push(createLogger());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const middleware = applyMiddleware(...(middlewares as any[]));

// Set up Redux DevTools Extension
const composeEnhancers =
  // (isDevelopment && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

// Create store
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const store = createStore(
  rootReducer,
  composeEnhancers(middleware)
);

export type AppDispatch = typeof store.dispatch;
export default store;