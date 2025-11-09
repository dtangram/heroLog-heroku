import { connect, ConnectedProps } from 'react-redux';
import { 
  fetchComicBookTitles, 
  deleteComicBookTitle 
} from '../../../store/comicbooklist/actions';

interface RootState {
  comicbooklists: Record<string, {
    allIds: string[];
    byId: Record<string, { data: { id: string; cbTitle: string } }>;
    isLoading: boolean;
  }>;
}

function mapStateToProps(state: RootState) {
  const { comicbooklists = {} } = state;
  return { comicbooklists };
}

const mapDispatchToProps = { 
  fetchComicBookTitles, 
  deleteComicBookTitle 
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;