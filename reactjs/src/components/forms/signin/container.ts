import { connect, ConnectedProps  } from 'react-redux';
import { loginUser } from '../../../store/signin/actions';
import { fetchUserProfile } from '../../../store/user/actions';

interface User {
  id: string;
  username: string;
  password: string;
}

interface UserState {
  data?: {
    id: string;
  };
}

interface RootState {
  signins: User;
  user: UserState;
}

const mapStateToProps = (state: RootState) => {
  const { signins, user } = state;
  
  const defaultUsers: User = {
    id: '',
    username: '',
    password: ''
  };
  
  const users = signins || defaultUsers;
  
  return { users, user };
};

const mapDispatchToProps = {
  loginUser,
  fetchUserProfile
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;