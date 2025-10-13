import { connect, ConnectedProps } from 'react-redux';
import {
  createPublisher,
  fetchPublisher,
  updatePublisher,
} from '../../../store/dashboard/actions';

interface Publisher {
  id: string;
  publisherName: string;
}

interface PublisherState {
  data: Publisher;
}

interface RootState {
  publishers: {
    byId: {
      [key: string]: PublisherState;
    };
    currentId?: string;
  };
}

const mapStateToProps = (state: RootState) => {
  const { publishers: { byId, currentId } } = state;
  
  // Try to get the current/last loaded publisher
  const publisherId = currentId || Object.keys(byId)[0];
  const publisher = publisherId && byId[publisherId] ? byId[publisherId].data : null;
  
  return { publisher };
};

const mapDispatchToProps = {
  createPublisher,
  fetchPublisher,
  updatePublisher,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;