import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreatePublisher from './CreatePublisher';
import { mapStateToProps } from './container';

jest.mock('../../../utils/anonymousUser', () => ({ getAnonymousUserId: () => 'anonymous-id' }));

// The store after the dashboard loaded the user's publishers
const state = {
  publishers: {
    byId: {
      'pub-dc': { data: { id: 'pub-dc', publisherName: 'DC Comics' } },
      'pub-marvel': { data: { id: 'pub-marvel', publisherName: 'Marvel' } },
    },
    currentId: 'pub-dc',
  },
};

const setupForm = (path: string, saveResult: unknown = { ok: true, data: {} }) => {
  const actions = {
    createPublisher: jest.fn().mockResolvedValue(saveResult),
    updatePublisher: jest.fn().mockResolvedValue(saveResult),
    fetchPublisher: jest.fn(),
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/forms/createpublisher/new/:userId"
          element={<CreatePublisher {...(mapStateToProps(state as any) as any)} {...(actions as any)} />}
        />
        <Route
          path="/forms/:userId/createpublisher/edit/:id"
          element={<CreatePublisher {...(mapStateToProps(state as any) as any)} {...(actions as any)} />}
        />
        <Route path="/dashboard/:userId" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>
  );
  return actions;
};

const nameField = () => screen.getByLabelText(/publisher name/i);

describe('Add a Publisher', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });
  // setupTests.ts clears localStorage after every test, so sign in before each one
  beforeEach(() => localStorage.setItem('id', 'user-1'));
  afterEach(() => jest.useRealTimers());

  it('is named for what it asks for and starts empty, even after publishers were loaded', () => {
    setupForm('/forms/createpublisher/new/user-1');

    expect(screen.getByRole('heading', { name: 'Add a Publisher' })).toBeInTheDocument();
    expect(screen.getByText(/organized by publisher, then title, then issue/i)).toBeInTheDocument();
    expect(nameField()).toHaveValue('');
  });

  it('waits for the save, names what was added, clears the field, then returns to the dashboard', async () => {
    jest.useFakeTimers();
    const actions = setupForm('/forms/createpublisher/new/user-1');

    fireEvent.change(nameField(), { target: { value: 'Image Comics' } });
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Image Comics was added. Next, add a title to it');
    expect(actions.createPublisher).toHaveBeenCalledWith({ publisherName: 'Image Comics', collectpubUsersId: 'user-1' });
    expect(nameField()).toHaveValue('');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows the error and stays on the form when the save fails', async () => {
    jest.useFakeTimers();
    setupForm('/forms/createpublisher/new/user-1', { ok: false, error: 'Publisher already exists' });

    fireEvent.change(nameField(), { target: { value: 'DC Comics' } });
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT' }));

    expect(await screen.findByText("Couldn't save DC Comics: Publisher already exists")).toBeInTheDocument();
    expect(screen.queryByText(/awesome/i)).not.toBeInTheDocument();
    expect(nameField()).toHaveValue('DC Comics');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});

describe('Edit a publisher', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });
  // setupTests.ts clears localStorage after every test, so sign in before each one
  beforeEach(() => localStorage.setItem('id', 'user-1'));

  it('opens the publisher whose Edit was clicked, with a heading that stays put while typing', () => {
    setupForm('/forms/user-1/createpublisher/edit/pub-marvel');

    expect(nameField()).toHaveValue('Marvel');
    fireEvent.change(nameField(), { target: { value: 'Marvel Comi' } });
    expect(screen.getByRole('heading', { name: 'Edit Marvel' })).toBeInTheDocument();
  });

  it('confirms the save by name', async () => {
    const actions = setupForm('/forms/user-1/createpublisher/edit/pub-marvel');

    fireEvent.change(nameField(), { target: { value: 'Marvel Comics' } });
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Saved your changes to Marvel Comics.');
    expect(actions.updatePublisher).toHaveBeenCalledWith({ id: 'pub-marvel', publisherName: 'Marvel Comics' });
  });
});