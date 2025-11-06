import { useEffect, useCallback } from 'react';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Link from '../../link';
import Empty from '../empty';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../utils/anonymousUser';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

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
  const handleDelete = useCallback((id: string, title: string): void => {
    if (!id) return;

    const confirmed = window?.confirm?.(
      `Are you sure you want to delete "${title}" from your wish list?`
    );

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
      window?.alert?.('Failed to delete wish list item. Please try again.');
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
  const currentWishlists = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as WishListItem[];

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
        <section>
          <article>
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
              <section className="comicSec" key={id}>
                <article className="comicWrap">
                  <section className="comicImgWrap">
                    <img 
                      src={comicBookCover || logo} 
                      alt={`${comicBookTitle} Issue ${comicIssue} cover`} 
                    />
                  </section>

                  <section className="paraWrap">
                    <p>
                      <span>Title:</span>
                      &nbsp;
                      {comicBookTitle}
                    </p>

                    {comicIssue && (
                      <p>
                        <span>Issue:</span>
                        &nbsp;
                        {comicIssue}
                      </p>
                    )}

                    {comicBookVolume && (
                      <p>
                        <span>Volume:</span>
                        &nbsp;
                        {comicBookVolume}
                      </p>
                    )}

                    {comicBookYear && (
                      <p>
                        <span>Year:</span>
                        &nbsp;
                        {comicBookYear}
                      </p>
                    )}

                    <p>
                      <span>Publisher:</span>
                      &nbsp;
                      {comicBookPublisher}
                    </p>

                    <p>
                      <span>Cover:</span>
                      &nbsp;
                      {type}
                    </p>

                    <section>
                      <section className="editStyle">
                        <figure><EditIcon /></figure>
                        <p className="link">
                          <Link 
                            className="link" 
                            url={`/forms/wishListform/edit/${id}`} 
                            title="Edit" 
                          />
                        </p>
                      </section>
                      
                      <button 
                        className="deleteStyle" 
                        type="button" 
                        onClick={() => handleDelete(id, comicBookTitle)}
                        aria-label={`Delete ${comicBookTitle} Issue ${comicIssue} from wish list`}
                      >
                        <figure><DeleteIcon /></figure>
                        <p>Delete</p>
                      </button>
                    </section>
                  </section>
                </article>
              </section>
            ))}
          </article>
        </section>
      </article>
    </article>
  );
};

export default WishList;