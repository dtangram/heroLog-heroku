import { connect, ConnectedProps } from 'react-redux';
import { createUser, fetchUser } from '../../../store/signup/actions';
import Signup from './Signup';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password: string;
  type: string;
}

interface SignupState {
  data: User;
}

interface RootState {
  signups: {
    byId: {
      [key: string]: SignupState;
    };
    currentId?: string;
    isLoading: boolean;  // ✅ Add this
    error: string | null;  // ✅ Add this
  };
}

const mapStateToProps = (state: RootState) => {
  const { signups: { byId, currentId, isLoading, error } } = state;
  
  const defaultUser: User = {
    id: '',
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    type: ''
  };
  
  // Try to get the current/last loaded signup
  const signupId = currentId || Object.keys(byId)[0];
  const signup = signupId && byId[signupId] ? byId[signupId].data : defaultUser;
  
  return { 
    signup,
    signupId: currentId,  // ✅ Expose signup ID (will be set on success)
    signupError: error,  // ✅ Expose error
    isLoading,  // ✅ Expose loading state
  };
};

const mapDispatchToProps = {
  createUser,
  fetchUser
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector(Signup);