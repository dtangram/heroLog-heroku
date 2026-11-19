import { connect, ConnectedProps } from 'react-redux';
import { 
  createComicBook,
  fetchComicBook,
  updateComicBook,
  deleteComicBook
} from '../../../store/comicbooklistissues/actions';
import { fetchComicBooks } from '../../../store/comicbooklistissues/actions';

interface ComicBook {
  id: string;
  title: string;
  comicIssue: number;
  author: string;
  penciler: string;
  coverartist: string;
  inker: string;
  volume: number;
  year: number;
  comicBookCover: string;
  type: 'Regular' | 'Variant' | '';
}

interface ComicBookState {
  data: ComicBook;
}

interface ComicBooksState {
  byId: {
    [key: string]: ComicBookState;
  };
}

interface RootState {
  comicbooklistissues: {
    [titleId: string]: ComicBooksState;
  };
}

/**
 * Every loaded comic book, keyed by its id, across all titles.
 * The form picks the one matching the :id in the URL. (Previously this
 * returned whichever comic was stored last, so Edit could open the wrong one.)
 */
export const mapStateToProps = (state: RootState) => {
  const comicBooksById: Record<string, ComicBook> = {};

  Object.values(state.comicbooklistissues || {}).forEach(title => {
    Object.entries(title?.byId || {}).forEach(([comicBookId, comicBookState]) => {
      if (comicBookState?.data) {
        comicBooksById[comicBookId] = comicBookState.data;
      }
    });
  });

  return { comicBooksById };
};

const mapDispatchToProps = {
  createComicBook,
  fetchComicBook,
  fetchComicBooks,
  updateComicBook,
  deleteComicBook,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;