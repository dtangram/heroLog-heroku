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
  
  const signupId = currentId || allIds[0] || Object.keys(byId)[0];
  const signup = signupId && byId[signupId] ? byId[signupId].data : defaultUser;
  
  // ✅ Convert error to field-mapped object
  const apiErrors: Record<string, string> = {};
  
  console.log('🔍 Raw error from state:', error);  // Debug log
  
  if (error) {
    if (typeof error === 'string') {
      apiErrors.general = error;
    } else if (Array.isArray(error)) {
      error.forEach((e: ErrorItem) => {
        const fieldName = e.field || 'general';
        if (apiErrors[fieldName]) {
          apiErrors[fieldName] += `\n${e.message}`;
        } else {
          apiErrors[fieldName] = e.message;
        }
      });
    }
  }
  
  console.log('🔍 Mapped apiErrors:', apiErrors);  // Debug log
  
  return { 
    signup,
    signupId: currentId || allIds[0],
    apiErrors,
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