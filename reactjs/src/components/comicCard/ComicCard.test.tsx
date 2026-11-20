import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComicCard, { ComicCardGrid } from './ComicCard';

const setupCard = (props: Partial<React.ComponentProps<typeof ComicCard>> = {}) => {
  const onDelete = jest.fn();
  render(
    <MemoryRouter>
      <ComicCardGrid label="Batman issues">
        <ComicCard
          title="Batman"
          issue={491}
          cover="/batman-491.jpg"
          meta={['Vol. 1', 1993, null, '']}
          type="regular"
          credits={[
            { label: 'Writer', value: 'Doug Moench' },
            { label: 'Penciler', value: 'Jim Aparo' },
            { label: 'Inker', value: '' },
            { label: 'Cover Artist', value: null },
          ]}
          editUrl="/edit/491"
          onDelete={onDelete}
          {...props}
        />
      </ComicCardGrid>
    </MemoryRouter>
  );
  return onDelete;
};

describe('ComicCard', () => {
  it('names the comic with its issue number', () => {
    setupCard();
    expect(screen.getByRole('heading', { name: 'Batman #491' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Batman issues' })).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows only the details that are filled in, never "N/A"', () => {
    setupCard();
    expect(screen.getByText(/Vol\. 1 · 1993/)).toBeInTheDocument();
    expect(screen.getByText('Doug Moench')).toBeInTheDocument();
    expect(screen.getByText('Jim Aparo')).toBeInTheDocument();
    expect(screen.queryByText('Inker')).not.toBeInTheDocument();
    expect(screen.queryByText('Cover Artist')).not.toBeInTheDocument();
    expect(screen.queryByText(/N\/A/)).not.toBeInTheDocument();
  });

  it('leaves out the credits list when no creators are known', () => {
    setupCard({ credits: [{ label: 'Writer', value: '' }] });
    expect(screen.queryByText('Writer')).not.toBeInTheDocument();
  });

  it('opens the cover larger when it is clicked', () => {
    setupCard();
    expect(screen.getByRole('link', { name: 'View larger: Batman #491 cover' })).toBeInTheDocument();
  });

  it('shows the logo when there is no cover yet', () => {
    setupCard({ cover: '' });
    expect(screen.getByRole('img', { name: 'Batman #491: no cover yet' })).toBeInTheDocument();
  });

  it('names the comic in Edit and Delete for screen readers', () => {
    const onDelete = setupCard();
    expect(screen.getByRole('link', { name: 'Edit Batman #491' })).toHaveAttribute('href', '/edit/491');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Batman #491' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows a listing\'s price as a price tag, labelled for screen readers', () => {
    setupCard({ price: '$12.50' });
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('Price:')).toBeInTheDocument();
  });

  it('says when a listing has no price yet', () => {
    setupCard({ price: null, noPriceText: 'No price yet. Edit to add one.' });
    expect(screen.getByText('No price yet. Edit to add one.')).toBeInTheDocument();
  });

  it('shows no price area on pages without prices', () => {
    setupCard({ noPriceText: 'No price yet. Edit to add one.' });
    expect(screen.queryByText(/price/i)).not.toBeInTheDocument();
  });

  it('opens a page from the name and cover when given a link (publishers and titles)', () => {
    setupCard({ issue: undefined, href: '/dashboard/titles', credits: [] });

    expect(screen.getByRole('link', { name: 'Batman' })).toHaveAttribute('href', '/dashboard/titles');
    // The cover is a second click target for mouse and touch, hidden from screen readers
    expect(screen.queryByRole('link', { name: /view larger/i })).not.toBeInTheDocument();
  });
});