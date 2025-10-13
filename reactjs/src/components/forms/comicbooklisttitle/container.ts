import { connect, ConnectedProps } from 'react-redux';
import {
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
} from '../../../store/comicbooklist/actions';

interface ComicBookTitle {
  id: string;
  cbTitle: string;
  collpubId: string;
}

interface ComicBookTitleState {
  data: ComicBookTitle;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface ComicBookTitlesState {
  byId: Record<string, ComicBookTitleState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  comicbooklists: Record<string, ComicBookTitlesState>;
}

interface OwnProps {
  match?: {
    params?: {
      id?: string;
      pubId?: string;
    };
  };
}

const findTitleInPublishers = (
  publishers: Record<string, ComicBookTitlesState>,
  id: string
): ComicBookTitle | null => {
  const publisherStates = Object.values(publishers);
 
  for (const state of publisherStates) {
    const titleState = state?.byId?.[id];
    if (titleState?.data) return titleState.data;
  }
 
  return null;
};

const mapStateToProps = (state: RootState, ownProps: OwnProps) => {
  const { id, pubId } = ownProps?.match?.params || {};
 
  if (!state?.comicbooklists) {
    return { comicbooklist: null, pubId };
  }

  // For edit mode, find the title across all publishers
  if (id) {
    const comicbooklist = findTitleInPublishers(state.comicbooklists, id);
    return { comicbooklist, pubId };
  }

  // For create mode, pass pubId to know which publisher
  return { comicbooklist: null, pubId };
};

const mapDispatchToProps = {
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;