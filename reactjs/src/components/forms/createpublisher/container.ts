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

/**
 * Every loaded publisher, keyed by id. The form picks the one whose :id is in
 * the URL; on "Add a Publisher" there's no id, so the form starts empty.
 * (Previously this returned the current or first publisher in the store, so
 * the add form could open with an existing publisher's name filled in.)
 */
export const mapStateToProps = (state: RootState) => {
  const publishersById: Record<string, Publisher> = {};

  Object.entries(state.publishers?.byId || {}).forEach(([publisherId, publisherState]) => {
    if (publisherState?.data) {
      publishersById[publisherId] = publisherState.data;
    }
  });

  return { publishersById };
};

const mapDispatchToProps = {
  createPublisher,
  fetchPublisher,
  updatePublisher,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ContainerProps = ConnectedProps<typeof connector>;

export default connector;