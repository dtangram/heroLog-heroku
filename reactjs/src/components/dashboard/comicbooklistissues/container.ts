import { connect, ConnectedProps } from 'react-redux';
import { 
  fetchComicBooks, 
  deleteComicBook 
} from '../../../store/comicbooklistissues/actions';

interface RootState {
  comicbooklistissues: Record<string, {
    allIds: string[];
    byId: Record<string, { 
      data: { 
        id: string;
        title: string;
        comicIssue: number;
        author: string;
        penciler: string;
        coverartist: string;
        inker: string;
        volume: number;
        year: number;
        type: string;
        comicBookCover: string;
      } 
    }>;
    isLoading: boolean;
  }>;
}

function mapStateToProps(state: RootState) {
  const { comicbooklistissues = {} } = state;
  return { comicbooklistissues };
}

const mapDispatchToProps = { 
  fetchComicBooks, 
  deleteComicBook 
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;