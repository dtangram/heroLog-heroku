import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from './Signup';
import { TERMS_URL } from '../../../siteLinks';

const show = () => {
  const createUser = jest.fn();
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Signup {...({ signup: undefined, signupId: undefined, apiErrors: [], isLoading: false, fetchUser: jest.fn(), createUser } as any)} />
    </MemoryRouter>
  );
  return { createUser };
};

const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { selector: 'input' }), { target: { value } });

describe('Sign up', () => {
  it('states the password rule under the field', () => {
    show();
    expect(screen.getByLabelText(/^Password/, { selector: 'input' })).toHaveAccessibleDescription(
      'At least 8 characters, with a letter and a number.'
    );
  });

  it('shows and hides the password', () => {
    show();
    const input = screen.getByLabelText(/^Password/, { selector: 'input' });
    const toggle = screen.getByRole('button', { name: 'Show' });

    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true');
  });

  it("explains the rule the server would reject, and doesn't send", () => {
    const { createUser } = show();
    fill('First name', 'Douglas');
    fill('Last name', 'Angram');
    fill('Username', 'dtangram');
    fill('Email', 'd@example.com');
    fill(/^Password/, 'comicbooks');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('Password must include a number')).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('mentions the Terms of Use and links to sign in', () => {
    show();
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', TERMS_URL);
    expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
  });
});