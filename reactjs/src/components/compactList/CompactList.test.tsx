import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompactList from './CompactList';

describe('CompactList', () => {
  it('shows one row per item with its page, add, edit and delete', () => {
    const onDelete = jest.fn();
    render(
      <MemoryRouter>
        <CompactList
          heading="No titles yet"
          addLabel="Add title"
          items={[{ id: 'p3', name: 'Dark Horse', href: '/pub/p3', addUrl: '/add/p3', editUrl: '/edit/p3', onDelete }]}
        />
      </MemoryRouter>
    );

    const list = screen.getByRole('region', { name: 'No titles yet' });
    expect(within(list).getByRole('link', { name: 'Dark Horse' })).toHaveAttribute('href', '/pub/p3');
    expect(within(list).getByRole('link', { name: 'Add title to Dark Horse' })).toHaveAttribute('href', '/add/p3');
    expect(within(list).getByRole('link', { name: 'Edit Dark Horse' })).toHaveAttribute('href', '/edit/p3');

    fireEvent.click(within(list).getByRole('button', { name: 'Delete Dark Horse' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('shows nothing when there are no items', () => {
    render(
      <MemoryRouter>
        <CompactList heading="No titles yet" items={[]} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('region', { name: 'No titles yet' })).not.toBeInTheDocument();
  });
});