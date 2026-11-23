import { useEffect, useCallback } from 'react';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import Empty from '../empty';
import ComicCard, { ComicCardGrid } from '../comicCard';
import CoverCredit from '../coverCredit/CoverCredit';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import { showAlert, showConfirm } from '../dialog';

interface WishListItem {
  id: string;
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  type: string;
  comicBookCover: string;
  userId: string;
}

interface WishListData {
  allIds: string[];
  byId: Record<string, { data: WishListItem }>;
  isLoading: boolean;
}

const WishList = ({
  fetchWishlists,
  wishlists = {},
  deleteWishlist,
}: ConnectorProps) => {
  // ✅ Get userId from localStorage or anonymous
  const userId = localStorage?.getItem('id') || getAnonymousUserId();

  console.log('📊 WishList Component');
  console.log('  - User ID:', userId);
  console.log('  - Wishlists state keys:', Object.keys(wishlists));
  console.log('  - Current wishlists data:', wishlists[userId]);

  // Fetch wish lists on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    console.log('🔄 Fetching wishlists...');
    fetchWishlists?.();
  }, [fetchWishlists]);

  // Handle wish list deletion
  const handleDelete = useCallback(async (id: string, title: string): Promise<void> => {
    if (!id) return;

    const confirmed = await showConfirm(`"${title}" will be removed from your wish list. This can't be undone.`, {
      title: 'Remove from your wish list?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      deleteWishlist?.(id);
      // Refetch data after deletion
      setTimeout(() => {
        fetchWishlists?.();
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete wish list item:', errorMessage);
      showAlert('Something went wrong while deleting this comic. Please try again.', { title: "The comic wasn't deleted" });
    }
  }, [deleteWishlist, fetchWishlists]);

  // ✅ Extract current wish list data using the correct userId
  const currentWishlistsData = wishlists[userId] || {};
  const { allIds = [], byId = {}, isLoading = false } = currentWishlistsData;

  console.log('📋 Wishlists data:', {
    allIds,
    byIdKeys: Object.keys(byId),
    isLoading
  });

  // Transform ids into array of wish list objects
  // Grouped by title, then in issue order
  const currentWishlists = (allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as WishListItem[])
    .sort((a, b) =>
      (a.comicBookTitle || '').localeCompare(b.comicBookTitle || '') ||
      (Number(a.comicIssue) || 0) - (Number(b.comicIssue) || 0)
    );

  console.log('📦 Current wishlists:', currentWishlists.length);

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbWishList">
        <h1>
          Your Comics for Wish List
          <figure className="graphic" aria-label="Small burgundy rectangle graphic" />
        </h1>

        <h2>
          <section>
            <RRLink to={`/forms/wishListform/new/${userId}`}>
              <figure><LibraryAddIcon /></figure>
              <p className="link">Add Comic to Wish List</p>
            </RRLink>
          </section>
        </h2>

        <article className="cbList">
          <section>
            <article>
              <article className="loadMessageWrap">
                <section>
                  <img src={logo} alt="HeroLog Logo" />
                </section>

                <section className="loadWrap">
                  <p className="loadMessage">Loading</p>
                  <BeatLoader size={10} color="#770422" />
                </section>
              </article>
            </article>
          </section>
        </article>
      </article>
    );
  }

  // Early return for empty state
  if (currentWishlists.length === 0) {
    return (
      <article id="cbWishList">
        <h1>
          Your Comics for Wish List
          <figure className="graphic" aria-label="Small burgundy rectangle graphic" />
        </h1>

        <h2>
          <section>
            <RRLink to={`/forms/wishListform/new/${userId}`}>
              <figure><LibraryAddIcon /></figure>
              <p className="link">Add Comic to Wish List</p>
            </RRLink>
          </section>
        </h2>

        <article className="cbList">
          <section>
            <article>
              <Empty />
            </article>
          </section>
        </article>
      </article>
    );
  }

  // Main render with wish lists
  return (
    <article id="cbWishList">
      <h1>
        Your Comics for Wish List
        <figure className="graphic" aria-label="Small burgundy rectangle graphic" />
      </h1>

      <h2>
        <section>
          <RRLink to={`/forms/wishListform/new/${userId}`}>
            <figure><LibraryAddIcon /></figure>
            <p className="link">Add Comic to Wish List</p>
          </RRLink>
        </section>
      </h2>

      <article className="cbList">
        <ComicCardGrid label="Your wish list">
          {currentWishlists.map(({
            id,
            comicBookTitle,
            comicIssue,
            comicBookVolume,
            comicBookYear,
            comicBookPublisher,
            type,
            comicBookCover
          }) => (
            <ComicCard
              key={id}
              title={comicBookTitle}
              issue={comicIssue}
              cover={comicBookCover}
              meta={[comicBookPublisher, comicBookVolume ? `Vol. ${comicBookVolume}` : null, comicBookYear]}
              type={type}
              editUrl={`/forms/wishListform/edit/${id}`}
              onDelete={() => handleDelete(id, comicIssue ? `${comicBookTitle} #${comicIssue}` : comicBookTitle)}
            />
          ))}
        </ComicCardGrid>
        <CoverCredit covers={currentWishlists.map(({ comicBookCover }) => comicBookCover)} />
      </article>
    </article>
  );
};

export default WishList;