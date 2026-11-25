import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RRLink } from 'react-router-dom';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import type { RootState } from '../../store';
import { addToWishlist } from '../../store/wishlist/actions';
import type { APICallResult } from '../../store/helpers/callAPIMiddleware';
import { notify, showAlert } from '../dialog';
import type { ClaudeResult } from '../../hooks/useSearch';
import styles from './styles.module.css';

export interface WishIssue {
  title: string;
  issue: string;
}

/**
 * "Detective Comics #27" → { title: "Detective Comics", issue: "27" }.
 * Null for results that aren't one numbered issue (a story arc or a
 * collected edition), since a wish list entry is a single comic.
 */
export const parseIssueTitle = (text: string): WishIssue | null => {
  const match = /^(.+?)\s*#\s*(\d+)\b/.exec(text.trim());
  return match ? { title: match[1].trim(), issue: match[2] } : null;
};

const normalize = (text: string | number | null | undefined) =>
  String(text ?? '').trim().toLowerCase().replace(/^the\s+/, '');

/** A 4-digit year the wish list accepts (1900 or later), or '' */
const toYear = (year: string | undefined) => {
  const found = /\b(19|20)\d{2}\b/.exec(year ?? '');
  return found ? found[0] : '';
};

interface Props {
  result: ClaudeResult;
  userId: string;
}

/**
 * One click from a search result to the Wish List. Shows "On your Wish List"
 * for comics already there, and nothing for results that aren't one issue.
 */
const AddToWishList = ({ result, userId }: Props) => {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const parsed = parseIssueTitle(result.title);
  const signedIn = Boolean(localStorage.getItem('token') && userId);

  const wishlist = useSelector((state: RootState) => (state as any)?.wishlists?.[userId]);
  const alreadyWished =
    parsed &&
    Object.values<any>(wishlist?.byId ?? {}).some(
      ({ data }) =>
        normalize(data?.comicBookTitle) === normalize(parsed.title) &&
        normalize(data?.comicIssue) === normalize(parsed.issue)
    );

  if (!parsed || !result.publisher?.trim()) return null;

  const name = `${parsed.title} #${parsed.issue}`;

  // Guests get one sign-in banner above the results instead of a link on every card
  if (!signedIn) return null;

  if (alreadyWished) {
    return (
      <p className={styles.wishAction}>
        <span className={styles.wishDone}>
          <BookmarkAddedIcon fontSize="inherit" aria-hidden="true" />
          On your Wish List
        </span>
        <RRLink className={styles.wishLink} to={`/wishlist/${userId}`}>
          View Wish List
        </RRLink>
      </p>
    );
  }

  const handleAdd = async () => {
    setIsAdding(true);
    const outcome = (await dispatch(
      addToWishlist({
        comicBookTitle: parsed.title,
        comicIssue: parsed.issue,
        comicBookVolume: '',
        comicBookYear: toYear(result.year),
        comicBookPublisher: result.publisher.trim(),
        comicBookCover: '',
        type: 'regular',
      }) as any
    )) as APICallResult;
    setIsAdding(false);

    if (outcome.ok) {
      notify(`Added ${name} to your Wish List.`);
    } else {
      showAlert(`${name} couldn't be added to your Wish List. ${outcome.error}`, {
        title: 'Not added',
      });
    }
  };

  return (
    <p className={styles.wishAction}>
      <button
        type="button"
        className={styles.wishButton}
        onClick={handleAdd}
        disabled={isAdding}
        aria-label={`${isAdding ? "Adding" : "Add to Wish List"}: ${name}`}
      >
        <BookmarkAddIcon fontSize="inherit" aria-hidden="true" />
        {isAdding ? 'Adding…' : 'Add to Wish List'}
      </button>
    </p>
  );
};

export default AddToWishList;