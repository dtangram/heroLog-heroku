import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';

const show = () =>
  render(
    <MemoryRouter>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard/u1' },
          { label: 'DC', to: '/dashboard/u1/p1/DC/comicbooklist' },
          { label: 'Batman' },
        ]}
      />
    </MemoryRouter>
  );

describe('Breadcrumbs', () => {
  it('lists the levels in order, top level first', () => {
    show();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const items = within(trail).getAllByRole('listitem').map(item => item.textContent);
    expect(items).toEqual(['Dashboard', 'DC', 'Batman']);
  });

  it('links the earlier levels', () => {
    show();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard/u1');
    expect(screen.getByRole('link', { name: 'DC' })).toHaveAttribute('href', '/dashboard/u1/p1/DC/comicbooklist');
  });

  it('marks the last level as the current page, not a link', () => {
    show();
    expect(screen.queryByRole('link', { name: 'Batman' })).not.toBeInTheDocument();
    expect(screen.getByText('Batman')).toHaveAttribute('aria-current', 'page');
  });
});