export const SITE_NAME = 'Hero-Log';

/** Page names that other places (breadcrumbs) also use */
export const SALE_LIST_TITLE = 'Your Comics for Sale';
export const WISH_LIST_TITLE = 'Your Wish List';

export type PageParams = Record<string, string | undefined>;

/** Route patterns (the same as App.tsx) and the tab title for each. */
export const PAGE_TITLES: Array<[string, string | ((params: PageParams) => string)]> = [
  ['/', 'Home'],
  ['/landing', 'Digitize Your Comic Collection'],
  ['/signup', 'Sign Up'],
  ['/signin', 'Sign In'],
  ['/forms/emailpasswordreset', 'Forgot Your Password?'],
  ['/forms/passwordreset/:token', 'Reset Your Password'],

  ['/dashboard/:userId', 'Your Collection'],
  ['/dashboard/:userId/:pubId/:publisherName/comicbooklist', ({ publisherName }) => `${publisherName} Titles`],
  [
    '/dashboard/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbooklistissues',
    ({ cbTitle, publisherName }) => `${cbTitle} · ${publisherName}`,
  ],
  ['/forms/createpublisher/new/:userId', 'Add a Publisher'],
  ['/forms/createpublisherProfile/new/:userId', 'Add a Publisher'],
  ['/forms/:userId/createpublisher/edit/:id', 'Edit Publisher'],
  ['/forms/:userId/:pubId/:publisherName/comicbooklisttitle/new', ({ publisherName }) => `Add a Title to ${publisherName}`],
  ['/forms/:userId/:pubId/:publisherName/comicbooklisttitle/edit/:id', 'Edit Title'],
  ['/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/new', ({ cbTitle }) => `Add an Issue to ${cbTitle}`],
  ['/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/edit/:id', ({ cbTitle }) => `Edit ${cbTitle} Issue`],

  ['/intel/:userId', 'Collection Insights'],
  ['/search/:userId', 'Search the Multiverse'],

  ['/sale/:userId', SALE_LIST_TITLE],
  ['/forms/saleform/new/:userId', 'Sell a Comic'],
  ['/forms/saleform/edit/:id', 'Edit Sale Listing'],
  ['/wishlist/:userId', WISH_LIST_TITLE],
  ['/forms/wishlistform/new/:userId', 'Add to Wish List'],
  ['/forms/wishlistform/edit/:id', 'Edit Wish List Comic'],

  ['/viewMessages/:userId', 'Your Messages'],
  ['/sentMessages/:userId', 'Your Sent Messages'],
  ['/forms/messaging/:userId/:comicBookTitle/:comicIssue/:userSent/:username/:userEmail', 'Send a Message'],
  ['/forms/reply/:messageID/:userId/:comicBookTitle/:prevMessage/:userSent/:username/:userEmail', 'Reply to a Message'],

  ['/profile/:userId', 'Profile'],
  ['/forms/profileform/edit/:id', 'Edit Profile'],
];