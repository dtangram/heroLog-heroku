// container.ts
// NOTE: This HOC pattern is maintained for compatibility, but modern React
// apps should use hooks (useSelector/useDispatch) directly in components instead

import { connect, ConnectedProps } from 'react-redux';
import {
  passwordResetUser,
  updatePasswordResetUser,
} from '../../../store/passwordreset/actions';
import { fetchUserProfile } from '../../../store/user/actions';

interface PasswordReset {
  username?: string;
  password?: string;
  passwordConfirm?: string;
}

interface User {
  id?: string;
  username?: string;
}

interface RootState {
  passwordreset?: PasswordReset;
  user?: User;
}

const mapStateToProps = (state: RootState) => {
  const { passwordreset = {}, user = {} } = state;
  return { passwordreset, user };
};

const mapDispatchToProps = {
  passwordResetUser,
  updatePasswordResetUser,
  fetchUserProfile,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;