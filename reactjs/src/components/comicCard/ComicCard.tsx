import React, { ReactNode } from 'react';
import { Link as RRLink } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CoverLightbox from '../coverLightbox';
import logo from '../../img/logo.png';
import styles from './styles.module.css';

type Value = string | number | null | undefined;

export interface Credit {
  label: string;
  value: Value;
}

interface ComicCardProps {
  title: string;
  issue?: Value;
  cover?: string | null;
  /** Short facts shown under the title, e.g. publisher, volume, year. Empty ones are skipped. */
  meta?: Value[];
  /** "Regular" or "Variant"; shown as a small tag */
  type?: string | null;
  /** Creators; only the ones that are filled in are shown */
  credits?: Credit[];
  /** Formatted price for a listing, e.g. "$12.50". Leave out on pages without prices. */
  price?: string | null;
  /** Shown instead when a listing has no price yet */
  noPriceText?: string;
  editUrl: string;
  onDelete: () => void;
}

const hasValue = (value: Value): value is string | number =>
  value !== null && value !== undefined && String(value).trim() !== '';

/**
 * One comic: the cover in a green frame overlapping a burgundy panel with
 * the details and actions. Used on the Sale page and the issue list, so
 * both look and work the same.
 */
const ComicCard = ({
  title,
  issue,
  cover,
  meta = [],
  type,
  credits = [],
  price,
  noPriceText,
  editUrl,
  onDelete,
}: ComicCardProps) => {
  const name = hasValue(issue) ? `${title} #${issue}` : title;
  const facts = meta.filter(hasValue);
  const filledCredits = credits.filter(credit => hasValue(credit.value));

  return (
    <li className={styles.card}>
      <div className={styles.mat}>
        {cover ? (
          <CoverLightbox src={cover} alt={`${name} cover`} caption={name}>
            <img className={styles.cover} src={cover} alt={`${name} cover`} />
          </CoverLightbox>
        ) : (
          <img className={`${styles.cover} ${styles.placeholder}`} src={logo} alt={`${name}: no cover yet`} />
        )}
      </div>

      <div className={styles.panel}>
        <h3 className={styles.name}>
          {title}
          {hasValue(issue) && <span className={styles.issue}> #{issue}</span>}
        </h3>

        {price ? (
          <p className={styles.price}>
            <span className={styles.srOnly}>Price: </span>
            {price}
          </p>
        ) : (
          price === null && noPriceText && <p className={styles.noPrice}>{noPriceText}</p>
        )}

        {(facts.length > 0 || type) && (
          <p className={styles.facts}>
            {facts.join(' · ')}
            {type && <span className={styles.tag}>{type}</span>}
          </p>
        )}

        {filledCredits.length > 0 && (
          <dl className={styles.credits}>
            {filledCredits.map(({ label, value }) => (
              <div key={label} className={styles.credit}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className={styles.actions}>
          <RRLink className={styles.action} to={editUrl} aria-label={`Edit ${name}`}>
            <EditIcon fontSize="inherit" aria-hidden="true" />
            <span className={styles.label}>Edit</span>
          </RRLink>
          <button className={styles.action} type="button" onClick={onDelete} aria-label={`Delete ${name}`}>
            <DeleteIcon fontSize="inherit" aria-hidden="true" />
            <span className={styles.label}>Delete</span>
          </button>
        </div>
      </div>
    </li>
  );
};

interface ComicCardGridProps {
  /** Names the list for screen readers, e.g. "Batman issues" */
  label: string;
  children: ReactNode;
}

export const ComicCardGrid = ({ label, children }: ComicCardGridProps) => (
  <ul className={styles.grid} aria-label={label}>
    {children}
  </ul>
);

export default ComicCard;