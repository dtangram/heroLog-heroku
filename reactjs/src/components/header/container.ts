import { connect, ConnectedProps } from 'react-redux';
import { loginUser } from '../../store/signin/actions';
import { logout, fetchUserProfile } from '../../store/user/actions';

interface UserData {
  id: string;
  profilePic: string;
  firstname: string;
}

interface User {
  data?: UserData;
}

interface SignIns {
  id?: string;
}

interface RootState {
  user: User;
  signins: SignIns;
}

function mapStateToProps(state: RootState) {
  const { user, signins } = state;
  return { user, signins };
}

const mapDispatchToProps = {
  loginUser,
  fetchUserProfile,
  logout,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;