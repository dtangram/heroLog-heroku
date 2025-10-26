import { connect, ConnectedProps } from 'react-redux';
import {
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
} from '../../../store/comicbooklist/actions';

interface ComicBookTitle {
  id: string;
  cbTitle: string;
  collectpubId: string;
}

interface ComicBookTitleState {
  data: ComicBookTitle;
}

interface ComicBookTitlesState {
  byId: {
    [key: string]: ComicBookTitleState;
  };
}

interface RootState {
  comicbooklists: {
    [collectpubId: string]: ComicBookTitlesState;
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

const mapStateToProps = (state: RootState) => {
  const { comicbooklists } = state;
 
  if (!comicbooklists) {
    return { comicbooklist: null };
  }

  // Try to find the most recently loaded title across all publishers
  const allPublishers = Object.values(comicbooklists);
  
  for (const publisher of allPublishers) {
    const titleIds = Object.keys(publisher?.byId || {});
    if (titleIds.length > 0) {
      const lastTitleId = titleIds[titleIds.length - 1];
      const titleState = publisher.byId[lastTitleId];
      if (titleState?.data) {
        return { comicbooklist: titleState.data };
      }
    }
  }
 
  return { comicbooklist: null };
};

const mapDispatchToProps = {
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;