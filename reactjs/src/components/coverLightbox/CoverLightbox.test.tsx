import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CoverLightbox from './CoverLightbox';

const renderLightbox = () =>
  render(
    <CoverLightbox src="/covers/batman-491.jpg" alt="Batman #491 cover" caption="Batman #491">
      <img src="/covers/batman-491.jpg" alt="Batman #491 cover" />
    </CoverLightbox>
  );

const openDialog = () => screen.queryByRole('dialog');

describe('CoverLightbox', () => {
  it('keeps a real link to the image, so it still works without JavaScript or in a new tab', () => {
    renderLightbox();

    const link = screen.getByRole('link', { name: 'View larger: Batman #491 cover' });
    expect(link).toHaveAttribute('href', '/covers/batman-491.jpg');
    expect(link).not.toHaveAttribute('target');
    expect(link).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('opens the cover over the page instead of navigating away', () => {
    renderLightbox();

    const link = screen.getByRole('link', { name: 'View larger: Batman #491 cover' });
    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(false); // the browser doesn't follow the link
    expect(openDialog()).toHaveAccessibleName('Batman #491 cover');
    expect(screen.getByText('Batman #491')).toBeInTheDocument();
  });

  it('closes with the close button and returns focus to the cover', () => {
    renderLightbox();
    const link = screen.getByRole('link', { name: 'View larger: Batman #491 cover' });

    fireEvent.click(link);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(openDialog()).not.toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  it('closes when the overlay is clicked, but not when the image is', () => {
    renderLightbox();
    fireEvent.click(screen.getByRole('link', { name: 'View larger: Batman #491 cover' }));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(screen.getAllByRole('img', { name: 'Batman #491 cover' })[1]);
    expect(dialog).toHaveAttribute('open');

    fireEvent.click(dialog);
    expect(openDialog()).not.toBeInTheDocument();
  });

  it('can be opened again after closing', () => {
    renderLightbox();
    const link = screen.getByRole('link', { name: 'View larger: Batman #491 cover' });

    fireEvent.click(link);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(link);

    expect(openDialog()).toBeInTheDocument();
  });

  it('leaves Ctrl/Cmd-click to the browser, which opens the image in a new tab', () => {
    renderLightbox();

    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'View larger: Batman #491 cover' }), {
      ctrlKey: true,
    });

    expect(notPrevented).toBe(true);
    expect(openDialog()).not.toBeInTheDocument();
  });
});