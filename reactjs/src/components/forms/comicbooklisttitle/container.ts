import { connect, ConnectedProps } from 'react-redux';
import {
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
} from '../../../store/comicbooklist/actions';

interface ComicBookTitle {
  id: string
  cbTitle: string
  collectpubId: string
  collectPubName: string
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

/**
 * Every loaded title, keyed by its id, across all publishers.
 * The form picks the one matching the :id in the URL. (Previously this
 * returned whichever title was stored last, so Edit could show the wrong one.)
 */
export const mapStateToProps = (state: RootState) => {
  const titlesById: Record<string, ComicBookTitle> = {};

  Object.values(state.comicbooklists || {}).forEach(publisher => {
    Object.entries(publisher?.byId || {}).forEach(([titleId, titleState]) => {
      if (titleState?.data) {
        titlesById[titleId] = titleState.data;
      }
    });
  });

  return { titlesById };
};

const mapDispatchToProps = {
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;