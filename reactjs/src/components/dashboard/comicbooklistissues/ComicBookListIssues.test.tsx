import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComicBookListIssues from './ComicBookListIssues';
import type { ConnectorProps } from './container';

jest.mock('../../dialog', () => ({ showConfirm: jest.fn() }));

const issue = (id: string, comicIssue: number) => ({ data: { id, title: 'Batman', comicIssue, comicBookCover: '' } });

const show = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/u1/p1/DC/t1/Batman/comicbooklistissues']}>
      <Routes>
        <Route
          path="/dashboard/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbooklistissues"
          element={
            <ComicBookListIssues
              {...({
                fetchComicBooks: jest.fn(),
                deleteComicBook: jest.fn(),
                comicbooklistissues: {
                  t1: { allIds: ['a', 'b', 'c'], byId: { a: issue('a', 497), b: issue('b', 423), c: issue('c', 491) }, isLoading: false },
                },
              } as unknown as ConnectorProps)}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.setItem('id', 'u1');
  window.scrollTo = jest.fn();
});

describe('Issues page', () => {
  it('shows a count line like the Dashboard and title pages', () => {
    show();
    expect(screen.getByText('3 issues · #423–#497')).toBeInTheDocument();
  });

  it('shows the breadcrumb trail Dashboard › DC › Batman', () => {
    show();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard/u1');
    expect(screen.getByRole('link', { name: 'DC' })).toHaveAttribute('href', '/dashboard/u1/p1/DC/comicbooklist');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('DashboardDCBatman');
  });
});