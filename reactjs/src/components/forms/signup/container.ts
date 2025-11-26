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
  
  if (error) {
    if (typeof error === 'string') {
      // Single string error - put in general field
      apiErrors.general = error;
    } else if (Array.isArray(error)) {
      // Array of { field, message } - map to fields
      error.forEach((e: ErrorItem) => {
        const fieldName = e.field || 'general';
        // Append if field already has an error
        if (apiErrors[fieldName]) {
          apiErrors[fieldName] += `\n${e.message}`;
        } else {
          apiErrors[fieldName] = e.message;
        }
      });
    }
  }
  
  return { 
    signup,
    signupId: currentId || allIds[0],
    apiErrors,  // ✅ Pass as object mapped by field
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