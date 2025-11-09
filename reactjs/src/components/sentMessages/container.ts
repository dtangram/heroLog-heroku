import { connect, ConnectedProps } from 'react-redux';
import {
  fetchMessagingsSent,
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

interface RootState {
  messagings: Messagings;
}

function mapStateToProps(state: RootState) {
  const { messagings = {} } = state;
  return { messagings };
}

const mapDispatchToProps = {
  fetchMessagingsSent,
  fetchMessaging,
  deleteMessaging,
  fetchUser,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;