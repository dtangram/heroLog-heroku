import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DialogHost from './DialogHost';
import { notify, resetDialogs, showAlert, showConfirm, TOAST_DURATION } from './dialogQueue';

afterEach(() => {
  act(() => resetDialogs());
  jest.useRealTimers();
});

describe('showAlert', () => {
  it('shows the message in a popup and resolves when OK is pressed', async () => {
    render(<DialogHost />);
    let closed = false;
    act(() => {
      showAlert('Please choose an image smaller than 1MB.', { title: 'That image is too large' }).then(() => {
        closed = true;
      });
    });

    const popup = screen.getByRole('alertdialog', { name: 'That image is too large' });
    expect(popup).toHaveAccessibleDescription('Please choose an image smaller than 1MB.');
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(closed).toBe(true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows queued popups one at a time', async () => {
    render(<DialogHost />);
    act(() => {
      showAlert('First');
      showAlert('Second');
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});

describe('showConfirm', () => {
  const askToDelete = () => {
    let answer: boolean | undefined;
    act(() => {
      showConfirm('Batman #401 will be removed.', { title: 'Delete Batman #401?', confirmLabel: 'Delete', tone: 'danger' }).then(
        value => {
          answer = value;
        }
      );
    });
    return () => answer;
  };

  it('focuses Cancel first, so Enter never deletes by accident', () => {
    render(<DialogHost />);
    askToDelete();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('resolves true when Delete is pressed', async () => {
    render(<DialogHost />);
    const answer = askToDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(answer()).toBe(true));
  });

  it('resolves false when Cancel is pressed', async () => {
    render(<DialogHost />);
    const answer = askToDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(answer()).toBe(false));
  });

  it('resolves false when the overlay is clicked', async () => {
    render(<DialogHost />);
    const answer = askToDelete();
    fireEvent.click(screen.getByRole('alertdialog'));
    await waitFor(() => expect(answer()).toBe(false));
  });

  it('resolves false when Esc is pressed', async () => {
    render(<DialogHost />);
    const answer = askToDelete();
    // Pressing Esc makes the browser fire "cancel" on the dialog
    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(answer()).toBe(false));
  });

  it('does not close when the panel itself is clicked', () => {
    render(<DialogHost />);
    askToDelete();
    fireEvent.click(screen.getByText('Batman #401 will be removed.'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('notify', () => {
  it('announces the message and closes itself', () => {
    jest.useFakeTimers();
    render(<DialogHost />);
    act(() => {
      notify('Cover scanned (90% confidence). Please review the filled-in fields.');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Cover scanned (90% confidence)');

    act(() => {
      jest.advanceTimersByTime(TOAST_DURATION);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('can be dismissed early', () => {
    render(<DialogHost />);
    act(() => {
      notify('Cover scanned');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Cover scanned')).not.toBeInTheDocument();
  });
});