import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '.';

jest.mock('./salePreview/SalePreview', () => () => null);

describe('Landing plans', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
    render(<MemoryRouter><Landing /></MemoryRouter>);
  });

  it('describes plans by what they let you do, not storage', () => {
    expect(screen.queryByText(/GB/)).not.toBeInTheDocument();
    expect(screen.queryByText(/60 Day|70 Day/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/30-day free trial/)).toHaveLength(2);
  });

  it('sends every plan button to Sign Up', () => {
    expect(screen.getByRole('link', { name: 'Sign Up: Free plan' })).toHaveAttribute('href', '/signup');
    screen.getAllByRole('link', { name: /^Start Free Trial/ }).forEach(link => expect(link).toHaveAttribute('href', '/signup'));
  });
});