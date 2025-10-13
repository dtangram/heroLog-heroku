import { connect, ConnectedProps } from 'react-redux';
import {
  createMessaging,
  fetchMessaging,
  updateMessaging
} from '../../../store/messagings/actions';
import ReplyMessage from './ReplyMessage';

interface Messaging {
  id: string;
  name: string;
  email: string;
  message: string;
}

interface MessagingState {
  data: Messaging;
}

interface RootState {
  messagings: {
    byId: {
      [key: string]: MessagingState;
    };
    currentId?: string;
  };
}

const mapStateToProps = (state: RootState) => {
  const { messagings: { byId, currentId } } = state;
 
  const defaultMessaging: Messaging = {
    id: '',
    name: '',
    email: '',
    message: ''
  };
 
  // Try to get the current/last loaded messaging
  const messagingId = currentId || Object.keys(byId)[0];
  const messaging = messagingId && byId[messagingId] ? byId[messagingId].data : defaultMessaging;
 
  return { messaging };
};

const mapDispatchToProps = {
  createMessaging,
  fetchMessaging,
  updateMessaging
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector(ReplyMessage);