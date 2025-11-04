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

// ✅ Update signins interface to include all state properties
interface SigninsState {
  id: string | null;
  username: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  signins: SigninsState;  // ✅ Updated type
  userProfile: UserState;  // ✅ Changed from 'user' to 'userProfile'
}

const mapStateToProps = (state: RootState) => {
  const { signins, userProfile } = state;
  
  const defaultUsers: User = {
    id: signins?.id || '',
    username: signins?.username || '',
    password: signins?.password || ''
  };
  
  const users = signins ? defaultUsers : defaultUsers;
  
  return { 
    users, 
    user: userProfile,
    signinId: signins?.id,  // ✅ Add this
    signinError: signins?.error,  // ✅ Add this
  };
};

const mapDispatchToProps = {
  loginUser,
  fetchUserProfile
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;