import React from 'react';
import { render, screen } from '@testing-library/react';
import CoverCredit, { sourceOf } from './CoverCredit';
import { COVER_SOURCES } from '../../constants/covers';

const comicVine = 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/batman-497.jpg';
const ownCover = 'https://my-bucket.example/superman-75.jpg';

describe('CoverCredit', () => {
  it('links back to each source whose covers are on the page', () => {
    render(<CoverCredit covers={[ownCover, comicVine]} />);

    expect(screen.getByRole('link', { name: 'Comic Vine' })).toHaveAttribute('href', 'https://comicvine.gamespot.com/');
  });

  it("shows nothing when all the covers are the collector's own", () => {
    const { container } = render(<CoverCredit covers={[ownCover, null]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('names several sources in one sentence', () => {
    COVER_SOURCES.push({ name: 'Grand Comics Database', url: 'https://www.comics.org/', host: 'comics.org' });
    try {
      render(<CoverCredit covers={[comicVine, 'https://files1.comics.org/covers/batman-497.jpg']} />);

      expect(screen.getByRole('paragraph')).toHaveTextContent('Some covers courtesy of Comic Vine and Grand Comics Database');
    } finally {
      COVER_SOURCES.pop();
    }
  });

  it("only counts a source's own address", () => {
    expect(sourceOf(comicVine)?.name).toBe('Comic Vine');
    expect(sourceOf('https://comicvine.gamespot.com.example.net/batman.jpg')).toBeUndefined();
    expect(sourceOf('not a url')).toBeUndefined();
    expect(sourceOf(undefined)).toBeUndefined();
  });
});