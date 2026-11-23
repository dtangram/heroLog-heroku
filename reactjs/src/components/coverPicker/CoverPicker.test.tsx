import React from 'react';
import { render, screen } from '@testing-library/react';
import CoverPicker from './CoverPicker';

const props = {
  label: 'Comic Book Cover',
  isUploading: false,
  onFileChange: jest.fn(),
  onScan: jest.fn(),
  isScanning: false,
};

describe('CoverPicker', () => {
  it('offers a cover image to choose, with the file types it accepts', () => {
    render(<CoverPicker {...props} hasCover={false} />);

    const input = screen.getByLabelText(/comic book cover/i);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/jpg,image/png');
    expect(screen.getByText('Choose cover')).toBeInTheDocument();
    expect(screen.getByText('JPG or PNG, up to 1MB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /scan cover/i })).not.toBeInTheDocument();
  });

  it('offers to change the cover and scan it once there is one', () => {
    render(<CoverPicker {...props} hasCover />);

    expect(screen.getByText('Change cover')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan cover with ai/i })).toBeInTheDocument();
  });

  it('says when the cover is uploading and holds the picker until it finishes', () => {
    render(<CoverPicker {...props} hasCover={false} isUploading />);

    expect(screen.getByText('Uploading…')).toBeInTheDocument();
    expect(screen.getByLabelText(/comic book cover/i)).toBeDisabled();
  });
});