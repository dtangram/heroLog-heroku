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
  /** "regular" or "variant". Only variants get a tag: regular is the default cover. */
  type?: string | null;
  /** Creators; only the ones that are filled in are shown */
  credits?: Credit[];
  /** Formatted price for a listing, e.g. "$12.50". Leave out on pages without prices. */
  price?: string | null;
  /** Shown instead when a listing has no price yet */
  noPriceText?: string;
  /**
   * Makes the card open a page: the name and cover link here (used for
   * publishers and titles). Without it, clicking the cover enlarges it.
   */
  href?: string;
  /** Alt text for the cover when it isn't the comic's own, e.g. "Newest cover in DC Comics" */
  coverAlt?: string;
  /** Adds an Edit link (your own comics) */
  editUrl?: string;
  /** Adds a Delete button (your own comics) */
  onDelete?: () => void;
  /**
   * Other actions, each in its own <li>, e.g. "Message seller" on Home.
   * Shown after Edit and Delete.
   */
  actions?: ReactNode;
}

const hasValue = (value: Value): value is string | number =>
  value !== null && value !== undefined && String(value).trim() !== '';

/**
 * One comic, title or publisher: the cover in a green frame overlapping a
 * burgundy panel with the details and actions. Used on the Dashboard, the
 * title and issue lists, Sale and Wish List, so they all look and work the same.
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
  href,
  coverAlt,
  editUrl,
  onDelete,
  actions,
}: ComicCardProps) => {
  const name = hasValue(issue) ? `${title} #${issue}` : title;
  const altText = coverAlt || `${name} cover`;
  const facts = meta.filter(hasValue);
  const filledCredits = credits.filter(credit => hasValue(credit.value));
  const isVariant = String(type ?? '').trim().toLowerCase() === 'variant';

  return (
    <li className={styles.card}>
      <figure className={styles.mat}>
        {cover && href ? (
          // The name below is the link screen readers and keyboards use;
          // the cover is a second, larger place to click for mouse and touch.
          <RRLink to={href} tabIndex={-1} aria-hidden="true">
            <img className={styles.cover} src={cover} alt="" />
          </RRLink>
        ) : cover ? (
          <CoverLightbox src={cover} alt={altText} caption={name}>
            <img className={styles.cover} src={cover} alt={altText} />
          </CoverLightbox>
        ) : (
          <img className={`${styles.cover} ${styles.placeholder}`} src={logo} alt={`${name}: no cover yet`} />
        )}
      </figure>

      <article className={styles.panel}>
        <h3 className={styles.name}>
          {href ? (
            <RRLink className={styles.nameLink} to={href}>
              {title}
            </RRLink>
          ) : (
            title
          )}
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

        {(facts.length > 0 || isVariant) && (
          <p className={styles.facts}>
            {facts.join(' · ')}
            {isVariant && <span className={styles.tag}>Variant cover</span>}
          </p>
        )}

        {filledCredits.length > 0 && (
          <ul className={styles.credits} aria-label="Creators">
            {filledCredits.map(({ label, value }) => (
              <li key={label} className={styles.credit}>
                <span className={styles.role}>{label}</span>
                <span className={styles.person}>{value}</span>
              </li>
            ))}
          </ul>
        )}

        {(editUrl || onDelete || actions) && (
          <menu className={styles.actions}>
            {editUrl && (
              <li>
                <RRLink className={styles.action} to={editUrl} aria-label={`Edit ${name}`}>
                  <EditIcon fontSize="inherit" aria-hidden="true" />
                  <span className={styles.label}>Edit</span>
                </RRLink>
              </li>
            )}
            {onDelete && (
              <li>
                <button className={styles.action} type="button" onClick={onDelete} aria-label={`Delete ${name}`}>
                  <DeleteIcon fontSize="inherit" aria-hidden="true" />
                  <span className={styles.label}>Delete</span>
                </button>
              </li>
            )}
            {actions}
          </menu>
        )}
      </article>
    </li>
  );
};

interface CardActionLinkProps {
  to: string;
  icon: ReactNode;
  label: string;
  /**
   * Fuller name for screen readers. Start it with the visible label, e.g.
   * "Message seller of Batman #497" for "Message seller", so people using
   * voice control can say what they see.
   */
  ariaLabel?: string;
}

/** A link styled like Edit and Delete, for ComicCard's actions prop. */
export const CardActionLink = ({ to, icon, label, ariaLabel }: CardActionLinkProps) => (
  <li>
    <RRLink className={styles.action} to={to} aria-label={ariaLabel}>
      {icon}
      <span className={styles.label}>{label}</span>
    </RRLink>
  </li>
);

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