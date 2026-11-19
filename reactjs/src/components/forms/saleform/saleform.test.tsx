import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SaleForm from './SaleForm';
import { mapStateToProps } from './container';

jest.mock('../../../API');
jest.mock('../../../utils/anonymousUser', () => ({ getAnonymousUserId: () => 'anonymous-id' }));
jest.mock('../../scanCoverButton/ScanCoverButton', () => () => null);
jest.mock('../../../hooks/useComicScanner', () => ({
  useComicScanner: () => ({ scanCover: jest.fn(), isScanning: false, scanError: '' }),
}));

const USER_ID = 'user-1';

// A saved comic as the API returns it: issue, volume and year are numbers,
// the price is text ("12.50", as Postgres sends DECIMAL), and the owner is
// saleUsersId (not userId).
const supermanFromApi = {
  id: 'comic-superman-25',
  comicBookTitle: 'Superman',
  comicIssue: 25,
  comicBookVolume: null,
  comicBookYear: 2025,
  comicBookPublisher: 'DC Comics',
  comicBookCover: 'superman-25.jpg',
  type: 'regular',
  price: '12.50',
  comicCondition: 'Near Mint',
  saleUsersId: USER_ID,
  userId: USER_ID,
};

// A listing saved before prices existed
const batmanWithoutPrice = {
  ...supermanFromApi,
  id: 'comic-batman-497',
  comicBookTitle: 'Batman',
  comicIssue: 497,
  comicBookYear: 1993,
  price: null,
  comicCondition: null,
};

// The store after the list page loaded Superman #25
const state = {
  sales: {
    [USER_ID]: {
      byId: {
        'comic-superman-25': { data: supermanFromApi, loadedAt: Date.now() },
        'comic-batman-497': { data: batmanWithoutPrice, loadedAt: Date.now() },
      },
      allIds: ['comic-superman-25', 'comic-batman-497'],
    },
  },
};

const renderForm = (path: string, route: string) => {
  const actions = {
    fetchSale: jest.fn(),
    createSale: jest.fn().mockResolvedValue(undefined),
    updateSale: jest.fn().mockResolvedValue(undefined),
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={<SaleForm {...(mapStateToProps(state as any) as any)} {...(actions as any)} />} />
      </Routes>
    </MemoryRouter>
  );
  return actions;
};

const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const type = (id: string, value: string) => fireEvent.change(field(id), { target: { value } });

describe('SaleForm', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
    // Signed in, as in the app
    localStorage.setItem('id', USER_ID);
  });

  afterAll(() => localStorage.removeItem('id'));

  it('starts empty on "Add New", even after another comic was loaded', () => {
    renderForm(`/forms/saleform/new/${USER_ID}`, '/forms/saleform/new/:userId');

    expect(field('comicBookTitle')).toHaveValue('');
    expect(field('comicIssue')).toHaveValue('');
    expect(screen.queryByAltText(/superman/i)).not.toBeInTheDocument();
    expect(document.querySelector('img[src="superman-25.jpg"]')).toBeNull();
  });

  it('fills in the comic whose Edit was clicked', async () => {
    renderForm('/forms/saleform/edit/comic-superman-25', '/forms/saleform/edit/:id');

    await waitFor(() => expect(field('comicBookTitle')).toHaveValue('Superman'));
    expect(field('comicIssue')).toHaveValue('25');
    expect(field('comicBookYear')).toHaveValue('2025');
    expect(field('comicBookVolume')).toHaveValue('');
    expect(field('price')).toHaveValue('12.50');
    expect(field('comicCondition')).toHaveValue('Near Mint');
    // Saved as "regular"; the radio button is "Regular"
    expect(screen.getByLabelText('Regular')).toBeChecked();
  });

  it('submits Update without needing a scan first', async () => {
    const actions = renderForm('/forms/saleform/edit/comic-superman-25', '/forms/saleform/edit/:id');
    await waitFor(() => expect(field('comicBookTitle')).toHaveValue('Superman'));

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() =>
      expect(actions.updateSale).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'comic-superman-25',
          comicIssue: '25',
          comicBookYear: '2025',
          price: '12.50',
          comicCondition: 'Near Mint',
        })
      )
    );
  });

  it('sends the price and condition with a new listing', async () => {
    const { createSale } = renderForm(`/forms/saleform/new/${USER_ID}`, '/forms/saleform/new/:userId');

    type('comicBookTitle', 'Batman');
    type('comicIssue', '497');
    type('comicBookPublisher', 'DC Comics');
    fireEvent.click(screen.getByLabelText('Regular'));
    type('price', '24.99');
    fireEvent.change(field('comicCondition'), { target: { value: 'Very Fine' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() =>
      expect(createSale).toHaveBeenCalledWith(
        expect.objectContaining({ comicBookTitle: 'Batman', price: '24.99', comicCondition: 'Very Fine' })
      )
    );
  });

  it('asks for a price and condition before an older listing can be updated', async () => {
    const { updateSale } = renderForm('/forms/saleform/edit/comic-batman-497', '/forms/saleform/edit/:id');
    await waitFor(() => expect(field('comicBookTitle')).toHaveValue('Batman'));
    expect(field('price')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    expect(await screen.findByText('Price is required')).toBeInTheDocument();
    expect(screen.getByText('Please choose a condition')).toBeInTheDocument();
    expect(updateSale).not.toHaveBeenCalled();
  });

  it('only lets dollars and cents be typed into the price', () => {
    renderForm(`/forms/saleform/new/${USER_ID}`, '/forms/saleform/new/:userId');

    type('price', '12.5');
    expect(field('price')).toHaveValue('12.5');
    type('price', '12.505');
    expect(field('price')).toHaveValue('12.5');
    type('price', '12a');
    expect(field('price')).toHaveValue('12.5');
    type('price', '$40');
    expect(field('price')).toHaveValue('40');
  });

  it('offers the standard comic grades', () => {
    renderForm(`/forms/saleform/new/${USER_ID}`, '/forms/saleform/new/:userId');

    const grades = screen.getAllByRole('option').map(option => option.textContent);
    expect(grades).toEqual([
      'Choose a condition',
      'Mint (9.9–10)',
      'Near Mint (9.2–9.8)',
      'Very Fine (7.5–9.0)',
      'Fine (5.5–7.0)',
      'Very Good (3.5–5.0)',
      'Good (1.8–3.0)',
      'Fair (1.0–1.5)',
      'Poor (0.5)',
    ]);
  });
});