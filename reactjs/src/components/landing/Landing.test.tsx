import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '.';
import { SUBSCRIPTION_PLANS } from '../../constants/landing';

jest.mock('./salePreview/SalePreview', () => () => null);

const showLanding = () => {
  window.scrollTo = jest.fn();
  render(<MemoryRouter><Landing /></MemoryRouter>);
};

describe('Landing plans', () => {
  it('shows every plan from the constants', () => {
    showLanding();
    SUBSCRIPTION_PLANS.forEach(({ title }) => expect(screen.getByText(title)).toBeInTheDocument());
  });

  it('describes plans by what they let you do, not storage', () => {
    showLanding();
    expect(screen.queryByText(/GB/)).not.toBeInTheDocument();
    expect(screen.queryByText(/60 Day|70 Day/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/30-day free trial/)).toHaveLength(2);
  });

  it('sends every plan button to Sign Up', () => {
    showLanding();
    expect(screen.getByRole('link', { name: 'Sign Up: Free plan' })).toHaveAttribute('href', '/signup');
    screen.getAllByRole('link', { name: /^Start Free Trial/ }).forEach(link => expect(link).toHaveAttribute('href', '/signup'));
  });
});