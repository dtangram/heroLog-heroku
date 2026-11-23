import React from 'react';
import styles from './styles.module.css';

/**
 * Where covers can come from. Each source's terms ask pages that show its
 * covers to link back to it. To add a source, list it here and add its lookup
 * to COVER_SOURCES in the API (api/app/services/covers/index.ts).
 */
export const COVER_SOURCES = [
  { name: 'Comic Vine', url: 'https://comicvine.gamespot.com/', host: 'comicvine.gamespot.com' },
];

type CoverSourceInfo = typeof COVER_SOURCES[number];

/** The source a cover came from, by its address (the host or one of its subdomains) */
export const sourceOf = (cover?: string | null): CoverSourceInfo | undefined => {
  if (!cover) return undefined;
  try {
    const { hostname } = new URL(cover);
    return COVER_SOURCES.find(({ host }) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return undefined;
  }
};

/** "A", "A and B", "A, B and C" */
const joinNames = (items: React.ReactNode[]): React.ReactNode[] =>
  items.flatMap((item, index) => {
    if (index === 0) return [item];
    return [index === items.length - 1 ? ' and ' : ', ', item];
  });

/**
 * "Some covers courtesy of …", linking to every source whose covers are on
 * the page. Shows nothing when all the covers are the collector's own.
 */
const CoverCredit: React.FC<{ covers: Array<string | null | undefined> }> = ({ covers }) => {
  const used = COVER_SOURCES.filter(source => covers.some(cover => sourceOf(cover) === source));
  if (used.length === 0) return null;

  return (
    <p className={styles.credit}>
      Some covers courtesy of{' '}
      {joinNames(used.map(({ name, url }) => (
        <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>
      )))}
    </p>
  );
};

export default CoverCredit;