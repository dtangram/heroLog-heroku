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
}

interface SignupState {
  data: User;
}

interface ErrorItem {
  field: string;
  message: string;
}

interface RootState {
  signups: {
    byId: {
      [key: string]: SignupState;
    };
    currentId?: string;
    allIds: string[];
    isLoading: boolean;
    error: string | ErrorItem[] | null;
  };
}

const mapStateToProps = (state: RootState) => {
  const { signups: { byId, currentId, allIds, isLoading, error } } = state;
  
  const defaultUser: User = {
    id: '',
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: ''
  };
  
  // Try to get the current/last loaded signup
  const signupId = currentId || allIds[0] || Object.keys(byId)[0];
  const signup = signupId && byId[signupId] ? byId[signupId].data : defaultUser;
  
  // ✅ Convert error to string
  let errorMessage: string | null = null;
  if (error) {
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (Array.isArray(error)) {
      errorMessage = error.map((e: ErrorItem) => e.message).join(', ');
    }
  }
  
  return { 
    signup,
    signupId: currentId || allIds[0],
    signupError: errorMessage,
    isLoading,
  };
};

const mapDispatchToProps = {
  createUser,
  fetchUser
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector(Signup);