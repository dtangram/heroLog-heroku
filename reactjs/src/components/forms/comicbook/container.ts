import { connect, ConnectedProps } from 'react-redux';
import {
  createComicBook,
  fetchComicBook,
  updateComicBook,
  deleteComicBook,
} from '../../../store/comicbooklistissues/actions';

interface ComicBookProps {
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
  data: ComicBookProps;
}

interface RootState {
  comicbooklistissues: {
    byId: {
      [key: string]: ComicBookState;
    };
    currentId?: string;
  };
}

const mapStateToProps = (state: RootState) => {
  const { comicbooklistissues: { byId, currentId } } = state;
  
  // Try to get the current/last loaded comic book
  const comicbookId = currentId || Object.keys(byId)[0];
  const comicbook = comicbookId && byId[comicbookId] ? byId[comicbookId].data : null;
  
  return { comicbook };
};

const mapDispatchToProps = {
  createComicBook,
  fetchComicBook,
  updateComicBook,
  deleteComicBook,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;