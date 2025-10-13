import { connect, ConnectedProps } from 'react-redux';
import { fetchUser, deleteUser } from '../../store/signup/actions';

interface Signup {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  type: string;
  profilePic: string;
}

interface SignupsState {
  byId: Record<string, { data: Signup }>;
  allIds: string[];
  isLoading: boolean;
}

interface RootState {
  signups: SignupsState;
}

function mapStateToProps(state: RootState) {
  const {
    signups: { byId, allIds, isLoading },
  } = state;
  
  // Turn the array of ids into an array of objects
  const signups = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as Signup[];
  
  return { signups, isLoading };
}

const mapDispatchToProps = {
  fetchUser,
  deleteUser,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;