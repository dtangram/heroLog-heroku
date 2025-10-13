import { connect, ConnectedProps } from 'react-redux';
import { fetchAllSales } from '../../store/saleALL/actions';

interface Sale {
  id: string;
  comicBookCover: string;
  comicBookTitle: string;
  comicBookVolume: number;
  comicBookYear: number;
  comicBookPublisher: string;
  comicIssue?: number;
  type: string;
  saleUsersId: string;
}

interface SalesALLState {
  byId: Record<string, { data: Sale }>;
  allIds: string[];
  isLoading: boolean;
}

interface UserData {
  id: string;
  firstname: string;
  username: string;
  email: string;
}

interface User {
  data?: UserData;
}

interface RootState {
  salesALL: SalesALLState;
  user: User;
}

function mapStateToProps(state: RootState) {
  const {
    salesALL: { byId, allIds, isLoading },
  } = state;
  
  // Turn the array of ids into an array of objects
  const salesALL = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as Sale[];
  
  return {
    salesALL,
    isLoading,
    user: state.user?.data,
  };
}

const mapDispatchToProps = { 
  fetchAllSales 
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;