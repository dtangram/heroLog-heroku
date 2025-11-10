import { render, screen, fireEvent } from '../../test-utils';
import ScanCoverButton from './ScanCoverButton';

describe('ScanCoverButton', () => {
  it('renders scan button correctly', () => {
    const mockOnScan = jest.fn();
    
    render(
      <ScanCoverButton
        onScan={mockOnScan}
        isScanning={false}
      />
    );

    const button = screen.getByRole('button', { name: /scan cover with ai/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('calls onScan when clicked', () => {
    const mockOnScan = jest.fn();
    
    render(
      <ScanCoverButton
        onScan={mockOnScan}
        isScanning={false}
      />
    );

    const button = screen.getByRole('button', { name: /scan cover with ai/i });
    fireEvent.click(button);

    expect(mockOnScan).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when scanning', () => {
    const mockOnScan = jest.fn();
    
    render(
      <ScanCoverButton
        onScan={mockOnScan}
        isScanning={true}
      />
    );

    expect(screen.getByText(/scanning/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('displays error message when provided', () => {
    const mockOnScan = jest.fn();
    const errorMessage = 'Failed to scan cover';
    
    render(
      <ScanCoverButton
        onScan={mockOnScan}
        isScanning={false}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    const mockOnScan = jest.fn();
    
    render(
      <ScanCoverButton
        onScan={mockOnScan}
        isScanning={false}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});