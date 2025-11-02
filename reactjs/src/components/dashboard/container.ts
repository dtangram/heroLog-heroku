import { connect, ConnectedProps } from 'react-redux';
import { fetchPublishers, deletePublisher } from '../../store/dashboard/actions';
import Dashboard from './Dashboard';  // ✅ Import the component

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Publisher {
  id: string;
  publisherName: string;
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

// ============================================================================
// MAP STATE TO PROPS
// ============================================================================

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

// ============================================================================
// MAP DISPATCH TO PROPS
// ============================================================================

const mapDispatchToProps = {
  fetchPublishers,
  deletePublisher,
};

// ============================================================================
// CONNECTOR
// ============================================================================

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;
export type { Publisher };

// ✅ Connect and export
export default connector(Dashboard);