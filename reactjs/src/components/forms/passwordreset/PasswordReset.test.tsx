import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import API from '../../../API';
import PasswordReset from './PasswordReset';

jest.mock('../../../API', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));

const show = () =>
  render(
    <MemoryRouter initialEntries={['/forms/passwordreset/abc']}>
      <Routes>
        <Route path="/forms/passwordreset/:token" element={<PasswordReset {...({} as any)} />} />
      </Routes>
    </MemoryRouter>
  );

describe('Password reset link states', () => {
  it('only says it is checking while the link is being checked', () => {
    (API.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    show();

    expect(screen.getByRole('status')).toHaveTextContent('Checking your reset link…');
    expect(screen.queryByText(/doesn't work/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });

  it('shows only the problem and a way to get a new link when the link has expired', async () => {
    (API.get as jest.Mock).mockRejectedValue({ response: { data: { error: 'Invalid or expired reset link' } } });
    show();

    expect(await screen.findByRole('heading', { name: "This link doesn't work" })).toBeInTheDocument();
    expect(screen.queryByText(/Checking your reset link/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Send me a new link' })).toHaveAttribute('href', '/forms/emailpasswordreset');
  });

  it('shows only the form when the link works', async () => {
    (API.get as jest.Mock).mockResolvedValue({ data: { username: 'douglas' } });
    show();

    expect(await screen.findByLabelText('New Password')).toBeInTheDocument();
    expect(screen.queryByText(/Checking your reset link/)).not.toBeInTheDocument();
    expect(screen.queryByText(/doesn't work/)).not.toBeInTheDocument();
  });
});