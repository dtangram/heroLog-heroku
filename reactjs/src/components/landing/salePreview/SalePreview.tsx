import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link as RRLink } from 'react-router-dom';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import API from '../../../API';
import ComicCard, { ComicCardGrid, CardActionLink } from '../../comicCard';
import { formatPrice } from '../../../utils/sale';
import logo from '../../../img/logo.png';
import styles from './styles.module.css';

/** A listing as the public preview sends it: the comic, never the seller */
export interface PreviewListing {
  id: string;
  comicBookTitle: string;
  comicIssue: number | string | null;
  comicBookVolume?: number | string | null;
  comicBookYear?: number | string | null;
  comicBookPublisher?: string | null;
  comicBookCover?: string | null;
  type?: string | null;
  price?: string | number | null;
  comicCondition?: string | null;
}

export const PREVIEW_SIZE = 8;

type Status = 'loading' | 'ready' | 'error';

/**
 * Loads the newest listings. Uses axios directly, not API, so a visitor who
 * only reads the Landing page doesn't get a guest session started for them.
 */
export const fetchSalePreview = async (): Promise<PreviewListing[]> => {
  const response = await axios.get(`${API.defaults.baseURL ?? ''}/salelistALL/preview`, {
    params: { limit: PREVIEW_SIZE },
    timeout: 15000,
  });
  const listings = response?.data?.data;
  return Array.isArray(listings) ? listings : [];
};

/** Placeholder cards while the listings load */
const PreviewSkeleton = () => (
  <ul className={styles.skeletonGrid} aria-hidden="true" data-testid="sale-preview-skeleton">
    {[0, 1, 2, 3].map(index => (
      <li key={index} className={styles.skeletonCard}>
        <span className={styles.skeletonCover} />
        <span className={styles.skeletonPanel}>
          <span className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
          <span className={styles.skeletonLine} />
          <span className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
        </span>
      </li>
    ))}
  </ul>
);

/**
 * "Comics for Sale" on the Landing page: the newest real listings, so a
 * visitor sees what's on offer. Messaging a seller needs an account, so each
 * card's action leads to Sign In. If listings can't load, the section is
 * hidden rather than shown broken.
 */
const SalePreview = () => {
  const [status, setStatus] = useState<Status>('loading');
  const [listings, setListings] = useState<PreviewListing[]>([]);

  useEffect(() => {
    let active = true;

    fetchSalePreview()
      .then(result => {
        if (!active) return;
        setListings(result);
        setStatus('ready');
      })
      .catch(error => {
        console.error('Could not load comics for sale:', error);
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === 'error') return null;

  return (
    <section className={styles.saleSection} aria-labelledby="landingSaleTitle" aria-busy={status === 'loading'}>
      <figure className="logo_graphic">
        <img src={logo} alt="Hero-Log logo" />
      </figure>

      <h2 id="landingSaleTitle" className={styles.heading}>Comics for Sale</h2>
      <figure className="graphic" aria-label="Small burgundy rectangle graphic" />

      {status === 'loading' && (
        <>
          <p className={styles.srOnly} role="status">Loading comics for sale…</p>
          <PreviewSkeleton />
        </>
      )}

      {status === 'ready' && listings.length > 0 && (
        <ComicCardGrid label="Comics for sale">
          {listings.map(listing => {
            const name = listing.comicIssue
              ? `${listing.comicBookTitle} #${listing.comicIssue}`
              : listing.comicBookTitle;

            return (
              <ComicCard
                key={listing.id}
                title={listing.comicBookTitle}
                issue={listing.comicIssue}
                cover={listing.comicBookCover}
                meta={[listing.comicCondition, listing.comicBookPublisher, listing.comicBookYear]}
                type={listing.type}
                price={formatPrice(listing.price)}
                noPriceText="Ask the seller for a price"
                actions={
                  <CardActionLink
                    to="/signin"
                    icon={<QuestionAnswerIcon fontSize="inherit" aria-hidden="true" />}
                    label="Sign in to message"
                    ariaLabel={`Sign in to message the seller of ${name}`}
                  />
                }
              />
            );
          })}
        </ComicCardGrid>
      )}

      {status === 'ready' && listings.length === 0 && (
        <p className={styles.empty}>
          No comics are listed for sale yet. Premium members can list theirs, and they&apos;ll appear here.
        </p>
      )}

      {status === 'ready' && (
        <aside className={styles.cta} aria-labelledby="landingSaleCta">
          <h3 id="landingSaleCta" className={styles.ctaTitle}>
            {listings.length > 0 ? 'See something you want?' : 'Want to buy, sell or trade?'}
          </h3>
          <p className={styles.ctaText}>
            Sign up to message sellers. Standard members can buy and trade comics, and Premium
            members can also sell their own.
          </p>
          <nav className={styles.ctaActions} aria-label="Join Hero-Log">
            <RRLink className={styles.ctaPrimary} to="/signup">Sign Up</RRLink>
            <RRLink className={styles.ctaSecondary} to="/signin">Sign In</RRLink>
          </nav>
        </aside>
      )}
    </section>
  );
};

export default SalePreview;