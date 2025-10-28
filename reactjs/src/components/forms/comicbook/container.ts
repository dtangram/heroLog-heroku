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
  type: 'regular' | 'variant' | '';
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

const mapStateToProps = (state: RootState) => {
  const { comicbooklistissues } = state;
 
  if (!comicbooklistissues) {
    return { comicbook: null };
  }

  // Try to find the most recently loaded comic book across all titles
  const allTitles = Object.values(comicbooklistissues);
  
  for (const title of allTitles) {
    const comicBookIds = Object.keys(title?.byId || {});
    if (comicBookIds.length > 0) {
      const lastComicBookId = comicBookIds[comicBookIds.length - 1];
      const comicBookState = title.byId[lastComicBookId];
      if (comicBookState?.data) {
        return { comicbook: comicBookState.data };
      }
    }
  }
 
  return { comicbook: null };
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