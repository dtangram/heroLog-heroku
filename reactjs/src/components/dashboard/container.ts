import { connect, ConnectedProps } from 'react-redux';
import { fetchPublishers, deletePublisher } from '../../store/dashboard/actions';
import Dashboard from './Dashboard';  

interface Publisher {
  id: string;
  publisherName: string;
  /** From the API: how many titles and issues, and the newest cover */
  titleCount?: number;
  issueCount?: number;
  coverUrl?: string | null;
}

interface PublisherState {
  byId: Record<string, { data: Publisher }>;
  allIds: string[];
  isLoading: boolean;
}

interface UserData {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  type: string;
  profilePic: string;
}

interface User {
  data?: UserData;
  isLoading: boolean;
}

interface RootState {
  publishers: PublisherState;
  userProfile: User;
}

function mapStateToProps(state: RootState) {
  const { publishers, userProfile } = state;
  
  // Transform publishers into array
  const publishersList = publishers?.allIds
    ?.filter(id => publishers.byId[id]?.data)
    .map(id => publishers.byId[id].data) || [];
  
  return {
    publishers: publishersList,
    isLoading: publishers?.isLoading || false,
    user: userProfile?.data,
  };
}

const mapDispatchToProps = {
  fetchPublishers,
  deletePublisher,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;
export type { Publisher };

// ✅ Connect and export
export default connector(Dashboard);