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

interface SaleItem {
  id: string;
  comicBookTitle: string;
  comicIssue: number;
  comicBookVolume: number;
  comicBookYear: number;
  comicBookPublisher: string;
  type: string;
  comicBookCover: string;
}

interface SaleData {
  allIds: string[];
  byId: Record<string, { data: SaleItem }>;
  isLoading: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const Sale = ({
  fetchSales,
  sales = {},
  deleteSale,
}: ConnectorProps) => {
  // ✅ Get userId from localStorage or anonymous
  const userId = localStorage?.getItem('id') || getAnonymousUserId();

  console.log('📊 Sale Component');
  console.log('  - User ID:', userId);
  console.log('  - Sales state keys:', Object.keys(sales));
  console.log('  - Current sales data:', sales[userId]);

  // Fetch sales on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    console.log('🔄 Fetching sales...');
    fetchSales?.();
  }, [fetchSales]);

  // Handle sale deletion
  const handleDelete = useCallback((id: string, title: string): void => {
    if (!id) return;

    const confirmed = window?.confirm?.(
      `Are you sure you want to delete "${title}" from your sale list?`
    );

    if (!confirmed) return;

    try {
      deleteSale?.(id);
      // Refetch data after deletion
      setTimeout(() => {
        fetchSales?.();
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete sale:', errorMessage);
      window?.alert?.('Failed to delete sale. Please try again.');
    }
  }, [deleteSale, fetchSales]);

  // ✅ Extract current sales data using the correct userId
  const currentSalesData = sales[userId] || {};
  const { allIds = [], byId = {}, isLoading = false } = currentSalesData;

  console.log('📋 Sales data:', {
    allIds,
    byIdKeys: Object.keys(byId),
    isLoading
  });

  // Transform ids into array of sale objects
  const currentSales = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as SaleItem[];

  console.log('📦 Current sales:', currentSales.length);

  // Early return for loading state
  if (isLoading) {
    return (
      <div id="cbSale">
        <h1>
          Your Comics for Sale
          <div className="graphic" aria-label="Small burgundy rectangle graphic" />
        </h1>

        <h2>
          <section>
            <RRLink to={`/forms/saleform/new/${userId}`}>
              <figure><LibraryAddIcon /></figure>
              <p className="link">Add Comic to Sale</p>
            </RRLink>
          </section>
        </h2>

        <div className="cbList">
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
        </div>
      </div>
    );
  }

  // Early return for empty state
  if (currentSales.length === 0) {
    return (
      <div id="cbSale">
        <h1>
          Your Comics for Sale
          <div className="graphic" aria-label="Small burgundy rectangle graphic" />
        </h1>

        <h2>
          <section>
            <RRLink to={`/forms/saleform/new/${userId}`}>
              <figure><LibraryAddIcon /></figure>
              <p className="link">Add Comic to Sale</p>
            </RRLink>
          </section>
        </h2>

        <div className="cbList">
          <section>
            <article>
              <Empty />
            </article>
          </section>
        </div>
      </div>
    );
  }

  // Main render with sales list
  return (
    <div id="cbSale">
      <h1>
        Your Comics for Sale
        <div className="graphic" aria-label="Small burgundy rectangle graphic" />
      </h1>

      <h2>
        <section>
          <RRLink to={`/forms/saleform/new/${userId}`}>
            <figure><LibraryAddIcon /></figure>
            <p className="link">Add Comic to Sale</p>
          </RRLink>
        </section>
      </h2>

      <div className="cbList">
        <section>
          <article>
            {currentSales.map(({
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
                            url={`/forms/saleform/edit/${id}`} 
                            title="Edit" 
                          />
                        </p>
                      </section>
                      
                      <button 
                        className="deleteStyle" 
                        type="button" 
                        onClick={() => handleDelete(id, comicBookTitle)}
                        aria-label={`Delete ${comicBookTitle} Issue ${comicIssue}`}
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
      </div>
    </div>
  );
};

export default Sale;