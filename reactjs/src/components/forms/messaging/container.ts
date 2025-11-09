import { connect, ConnectedProps } from 'react-redux';
import {
  fetchMessagings,
  createMessaging,
  fetchMessaging,
} from '../../../store/messagings/actions';

interface Messaging {
  id?: string;
  name?: string;
  email?: string;
  message?: string;
}

interface MessagingState {
  data?: Messaging;
}

interface RootState {
  messagings?: {
    byId?: {
      [key: string]: MessagingState;
    };
    currentId?: string;
  };
}

const mapStateToProps = (state: RootState) => {
  const messagings = state.messagings || {};
  const { byId, currentId } = messagings;
  
  // Try to get the current/last loaded messaging
  const messagingId = currentId || (byId ? Object.keys(byId)[0] : undefined);
  const messaging = messagingId && byId?.[messagingId]?.data 
    ? byId[messagingId].data 
    : {};
  
  return { messaging, messagings };
};

const mapDispatchToProps = {
  fetchMessagings,
  createMessaging,
  fetchMessaging,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;