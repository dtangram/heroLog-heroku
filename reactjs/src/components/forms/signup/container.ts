import { connect } from 'react-redux';
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
  };
}

const mapStateToProps = (state: RootState) => {
  const { signups: { byId, currentId } } = state;
  
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
  
  return { signup };
};

const mapDispatchToProps = {
  createUser,
  fetchUser
};

export default connect(mapStateToProps, mapDispatchToProps)(Signup);