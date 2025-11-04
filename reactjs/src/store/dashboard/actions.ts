import API from '../../API';
import { getCurrentUserId } from '../../utils/anonymousUser';
import {
  REQ_PUBLISHERS_PENDING,
  REQ_PUBLISHERS_SUCCESS,
  REQ_PUBLISHERS_ERROR,
  REQ_PUBLISHER_PENDING,
  REQ_PUBLISHER_SUCCESS,
  REQ_PUBLISHER_ERROR,
  ADD_PUBLISHER_PENDING,
  ADD_PUBLISHER_SUCCESS,
  ADD_PUBLISHER_ERROR,
  UPDATE_PUBLISHER_PENDING,
  UPDATE_PUBLISHER_SUCCESS,
  UPDATE_PUBLISHER_ERROR,
  DELETE_PUBLISHER_PENDING,
  DELETE_PUBLISHER_SUCCESS,
  DELETE_PUBLISHER_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

export interface Publisher {
  id: string;
  publisherName: string;
  collectpubUsersId?: string;
}

interface PublisherState {
  data: Publisher;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface PublishersState {
  byId: Record<string, PublisherState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  publishers: Record<string, PublishersState>;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: Publisher | Publisher[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | Publisher | Partial<Publisher>>;
}

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const shouldFetchUserPublishers = (state: RootState, userId: string): boolean => {
  const userPublishers = state.publishers[userId];
  
  if (!userPublishers) return true;
  if (userPublishers.isLoading) return false;
  if (!userPublishers.loadedAt) return true;
  
  return !isCached(userPublishers.loadedAt);
};

const shouldFetchPublisher = (state: RootState, id: string): boolean => {
  const allUsers = Object.values(state.publishers);
  const publisherState = allUsers.find(user => user.byId[id])?.byId[id];
  
  if (!publisherState) return true;
  if (publisherState.isLoading) return false;
  if (!publisherState.loadedAt) return true;
  
  return !isCached(publisherState.loadedAt);
};

const validatePublisher = (publisher: Partial<Publisher>): void => {
  if (!publisher.publisherName?.trim()) {
    throw new Error('Publisher name is required');
  }
};

export const fetchPublishers = (idUser?: string): APIAction => {
  const userId = idUser || getCurrentUserId();
  
  return {
    types: [
      REQ_PUBLISHERS_PENDING,
      REQ_PUBLISHERS_SUCCESS,
      REQ_PUBLISHERS_ERROR,
    ],
    callAPI: () => API.get(`/collectpub?userId=${userId}`),
    payload: { userId },
  };
};

export const fetchPublisher = (id: string): APIAction => ({
  types: [
    REQ_PUBLISHER_PENDING,
    REQ_PUBLISHER_SUCCESS,
    REQ_PUBLISHER_ERROR,
  ],
  callAPI: () => API.get(`/collectpub/${id}`),
  shouldCallAPI: (state: RootState) => shouldFetchPublisher(state, id),
  payload: { id },
});

export const createPublisher = (publisher: Omit<Publisher, 'id'>): APIAction => {
  validatePublisher(publisher);

  const userId = getCurrentUserId();
  
  return {
    types: [
      ADD_PUBLISHER_PENDING,
      ADD_PUBLISHER_SUCCESS,
      ADD_PUBLISHER_ERROR,
    ],
    callAPI: () => API.post('/collectpub/create', {
      publisherName: publisher.publisherName.trim(),
      collectpubUsersId: userId
    }),
    payload: { 
      publisher: { 
        publisherName: publisher.publisherName 
      } as Partial<Publisher>,
    },
  };
};

export const updatePublisher = (publisher: Publisher): APIAction => {
  validatePublisher(publisher);
  
  const { id, publisherName } = publisher;

  return {
    types: [
      UPDATE_PUBLISHER_PENDING,
      UPDATE_PUBLISHER_SUCCESS,
      UPDATE_PUBLISHER_ERROR,
    ],
    callAPI: () => API.put(`/collectpub/${id}`, {
      publisherName: publisherName?.trim(),
    }),
    payload: { id },
  };
};

export const deletePublisher = (id: string): APIAction => ({
  types: [
    DELETE_PUBLISHER_PENDING,
    DELETE_PUBLISHER_SUCCESS,
    DELETE_PUBLISHER_ERROR,
  ],
  callAPI: () => API.delete(`/collectpub/${id}`, { params: { id } }),
  payload: { id },
});

export default fetchPublishers;