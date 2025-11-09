import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { fetchUser, updateUser } from '../../../store/signup/actions';
import ProfileForm from './ProfileForm';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password?: string;
  profilePic: string;
  type: string;
}

const mapStateToProps = (state: RootState) => {
  const userId = localStorage.getItem('id') || '';
  
  const defaultUser: User = {
    id: '',
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    profilePic: '',
    type: ''
  };
  
  // Now TypeScript knows signups has byId
  const userState = state.signups.byId[userId];
  const signup = userState?.data || defaultUser;
  
  return { signup };
};

const mapDispatchToProps = {
  fetchUser,
  updateUser
};

export default connect(mapStateToProps, mapDispatchToProps)(ProfileForm);