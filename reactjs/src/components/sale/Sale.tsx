import { useEffect, useCallback } from 'react';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import Empty from '../empty';
import ComicCard, { ComicCardGrid } from '../comicCard';
import { formatPrice } from '../../utils/sale';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import { showAlert, showConfirm } from '../dialog';

interface SaleItem {
  id: string;
  comicBookTitle: string;
  comicIssue: number;
  comicBookVolume: number;
  comicBookYear: number;
  comicBookPublisher: string;
  type: string;
  comicBookCover: string;
  /** Dollars as text, e.g. "12.50" (null on listings made before prices existed) */
  price?: string | null;
  /** Standard comic grade, e.g. "Near Mint" */
  comicCondition?: string | null;
}

interface SaleData {
  allIds: string[];
  byId: Record<string, { data: SaleItem }>;
  isLoading: boolean;
}

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
  const handleDelete = useCallback(async (id: string, title: string): Promise<void> => {
    if (!id) return;

    const confirmed = await showConfirm(`"${title}" will be removed from your sale list. This can't be undone.`, {
      title: 'Remove this comic from sale?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });

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
      showAlert('Something went wrong while deleting this comic. Please try again.', { title: "The comic wasn't deleted" });
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
  // Grouped by title, then in issue order
  const currentSales = (allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as SaleItem[])
    .sort((a, b) =>
      (a.comicBookTitle || '').localeCompare(b.comicBookTitle || '') ||
      (Number(a.comicIssue) || 0) - (Number(b.comicIssue) || 0)
    );

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
        <ComicCardGrid label="Your comics for sale">
          {currentSales.map(({
            id,
            comicBookTitle,
            comicIssue,
            comicBookVolume,
            comicBookYear,
            comicBookPublisher,
            type,
            comicBookCover,
            price,
            comicCondition
          }) => (
            <ComicCard
              key={id}
              title={comicBookTitle}
              issue={comicIssue}
              cover={comicBookCover}
              meta={[comicCondition, comicBookPublisher, comicBookVolume ? `Vol. ${comicBookVolume}` : null, comicBookYear]}
              type={type}
              price={formatPrice(price)}
              noPriceText="No price yet. Edit to add one."
              editUrl={`/forms/saleform/edit/${id}`}
              onDelete={() => handleDelete(id, comicIssue ? `${comicBookTitle} #${comicIssue}` : comicBookTitle)}
            />
          ))}
        </ComicCardGrid>
      </div>
    </div>
  );
};

export default Sale;