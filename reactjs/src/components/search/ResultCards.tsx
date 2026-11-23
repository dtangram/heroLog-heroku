import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import AddToWishList from './AddToWishList';
import { ClaudeResult, CollectionResult, ResultGroup } from '../../hooks/useSearch';
import logo from '../../img/logo.png';
import styles from './styles.module.css';

const Description: React.FC<{ text: string }> = ({ text }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isCutOff, setIsCutOff] = useState(false);

  useLayoutEffect(() => {
    const paragraph = ref.current;
    if (!paragraph || expanded) return undefined;
    const check = () => setIsCutOff(paragraph.scrollHeight > paragraph.clientHeight + 1);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text, expanded]);

  return (
    <>
      <p ref={ref} className={clsx(styles.description, !expanded && styles.clamped)}>{text}</p>
      {(isCutOff || expanded) && (
        <button
          type="button"
          className={styles.readMore}
          aria-expanded={expanded}
          onClick={() => setExpanded(open => !open)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
};

/** Where a comic lives in the collection: its title's list of issues */
const issuesPath = (userId: string, result: CollectionResult): string | null =>
  result.publisher_id && result.publisher_name && result.title_id && result.series
    ? `/dashboard/${userId}/${result.publisher_id}/${encodeURIComponent(result.publisher_name)}/${result.title_id}/${encodeURIComponent(result.series)}/comicbooklistissues`
    : null;

/** A comic from the collection: its cover, how well it matches, and a link to it */
export const CollectionResultCard: React.FC<{ result: CollectionResult; userId: string }> = ({ result, userId }) => {
  const path = issuesPath(userId, result);

  return (
    <article className={clsx(styles.resultCard, styles.withCover)}>
      <figure className={styles.resultCover}>
        {result.cover
          ? <img src={result.cover} alt={`Cover of ${result.title}`} loading="lazy" />
          : <img className={styles.coverPlaceholder} src={logo} alt={`${result.title}: no cover yet`} />}
      </figure>
      <section className={styles.resultBody}>
        <section className={styles.resultHeader}>
          <h3>{path ? <Link to={path}>{result.title}</Link> : result.title}</h3>
          <span className={styles.scoreBadge}>
            {Math.round(result.similarity_score * 100)}% match
          </span>
        </section>
        <Description text={result.description} />
      </section>
    </article>
  );
};

/** Group order and headings on the page */
const GROUPS: Array<{ group: ResultGroup; heading: string }> = [
  { group: 'Main story', heading: 'Main story' },
  { group: 'Tie-in', heading: 'Tie-ins' },
  { group: 'Related', heading: 'Related' },
];

/** Results sorted into groups, in page order, leaving out empty groups */
export const groupResults = (results: ClaudeResult[]) =>
  GROUPS
    .map(({ group, heading }) => ({
      group,
      heading,
      results: results.filter(result => (result.group ?? 'Related') === group),
    }))
    .filter(({ results: inGroup }) => inGroup.length > 0);

const ClaudeResultCard: React.FC<{
  result: ClaudeResult;
  userId: string;
  Heading: 'h3' | 'h4';
}> = ({ result, userId, Heading }) => (
  <article className={clsx(styles.resultCard, result.already_owned && styles.owned)}>
    <section className={styles.resultHeader}>
      <Heading>{result.title}</Heading>
      <aside className={styles.badges}>
        {result.year && <span className={styles.yearBadge}>{result.year}</span>}
        {result.already_owned && <span className={styles.ownedBadge}>Owned</span>}
      </aside>
    </section>
    {result.publisher && <p className={styles.publisher}>{result.publisher}</p>}
    <Description text={result.description} />
    {!result.already_owned && <AddToWishList result={result} userId={userId} />}
  </article>
);

export const ClaudeResultList: React.FC<{
  results: ClaudeResult[];
  userId: string;
}> = ({ results, userId }) => {
  const groups = groupResults(results);
  const showGroups = groups.length > 1;

  if (!showGroups) {
    return (
      <>
        {results.map((result, index) => (
          <ClaudeResultCard key={`${result.title}-${index}`} result={result} userId={userId} Heading="h3" />
        ))}
      </>
    );
  }

  return (
    <>
      {groups.map(({ group, heading, results: inGroup }) => (
        <section key={group} className={styles.resultGroup} aria-labelledby={`results-${group.replace(' ', '-')}`}>
          <h3 id={`results-${group.replace(' ', '-')}`} className={styles.groupHeading}>
            {heading} <span className={styles.groupCount}>({inGroup.length})</span>
          </h3>
          {inGroup.map((result, index) => (
            <ClaudeResultCard key={`${result.title}-${index}`} result={result} userId={userId} Heading="h4" />
          ))}
        </section>
      ))}
    </>
  );
};