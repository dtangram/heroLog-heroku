import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Empty from '.';

describe('Empty', () => {
  it("says what's missing and offers the next step", () => {
    render(
      <MemoryRouter>
        <Empty title="No messages yet" message="Messages will show up here." action={{ label: 'Browse comics for sale', to: '/#forSale' }} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No messages yet' })).toBeInTheDocument();
    expect(screen.getByText('Messages will show up here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse comics for sale' })).toHaveAttribute('href', '/#forSale');
  });

  it('has a short default when a page gives no details', () => {
    render(<MemoryRouter><Empty /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});