import { connect, ConnectedProps } from 'react-redux';
import {
  fetchMessagings,
  fetchMessaging,
  deleteMessaging,
} from '../../store/messagings/actions';
import { fetchUser } from '../../store/signup/actions';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  userSent: string;
}

interface MessagingData {
  allIds: string[];
  byId: Record<string, { data: Message }>;
  isLoading: boolean;
}

interface Messagings {
  [userId: string]: MessagingData;
}

interface Signup {
  id: string;
  username: string;
  email: string;
}

interface SignupsState {
  byId: Record<string, { data: Signup }>;
  allIds: string[];
}

interface RootState {
  messagings: Messagings;
  signups: SignupsState;
}

function mapStateToProps(state: RootState) {
  const { messagings = {}, signups } = state;
  
  // Get all user signups for reply functionality
  const allSignups = signups?.allIds
    ?.map(id => signups.byId[id]?.data)
    .filter(Boolean) as Signup[] || [];
  
  return { 
    messagings,
    signups: allSignups
  };
}

const mapDispatchToProps = {
  fetchMessagings,
  fetchMessaging,
  deleteMessaging,
  fetchUser,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;