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

interface UserProfile {
  data?: Signup;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  userProfile: UserProfile;  // ✅ Changed from signups to userProfile
}

function mapStateToProps(state: RootState) {
  const { userProfile } = state;
  
  console.log('📊 Profile container - userProfile state:', userProfile);
  
  // ✅ Convert single user object to array for component compatibility
  const signups = userProfile?.data ? [userProfile.data] : [];
  
  return { 
    signups, 
    isLoading: userProfile?.isLoading || false 
  };
}

const mapDispatchToProps = {
  fetchUser,
  deleteUser,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;