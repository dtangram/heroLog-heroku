import { connect, ConnectedProps } from 'react-redux';
import { emailPasswordResetUser } from '../../../store/emailpasswordreset/actions';

interface EmailPasswordReset {
  email?: string;
}

interface RootState {
  emailpasswordreset?: EmailPasswordReset;
}

const mapStateToProps = (state: RootState) => {
  const emailpasswordreset: EmailPasswordReset = state.emailpasswordreset || {};
  
  return { emailpasswordreset };
};

const mapDispatchToProps = {
  emailPasswordResetUser,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;