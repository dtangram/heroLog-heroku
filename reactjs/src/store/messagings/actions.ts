import { v4 as uuidv4 } from 'uuid';
import API from '../../API';
import {
  REQ_MESSAGINGS_PENDING,
  REQ_MESSAGINGS_SUCCESS,
  REQ_MESSAGINGS_ERROR,
  REQ_MESSAGING_PENDING,
  REQ_MESSAGING_SUCCESS,
  REQ_MESSAGING_ERROR,
  ADD_MESSAGING_PENDING,
  ADD_MESSAGING_SUCCESS,
  ADD_MESSAGING_ERROR,
  UPDATE_MESSAGING_PENDING,
  UPDATE_MESSAGING_SUCCESS,
  UPDATE_MESSAGING_ERROR,
  DELETE_MESSAGE_PENDING,
  DELETE_MESSAGE_SUCCESS,
  DELETE_MESSAGE_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  messageUsersId: string;
  subject: string;
  userSent: string;
  userId: string;
}

interface MessageState {
  data: Message;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface MessagingsState {
  byId: Record<string, MessageState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  messagings: Record<string, MessagingsState>;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: Message | Message[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | Message | Partial<Message>>;
}

const getUserId = (): string => {
  const userId = localStorage.getItem('id');
  return userId || '';
};

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const shouldFetchMessagings = (state: RootState, userId: string): boolean => {
  const userMessagings = state.messagings[userId];
  
  if (!userMessagings) return true;
  if (userMessagings.isLoading) return false;
  if (!userMessagings.loadedAt) return true;
  
  return !isCached(userMessagings.loadedAt);
};

const shouldFetchMessage = (state: RootState, id: string): boolean => {
  const allUsers = Object.values(state.messagings);
  const messageState = allUsers.find(user => user.byId[id])?.byId[id];
  
  if (!messageState) return true;
  if (messageState.isLoading) return false;
  if (!messageState.loadedAt) return true;
  
  return !isCached(messageState.loadedAt);
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const fetchMessagings = (): APIAction => {
  const userId = getUserId();
  
  return {
    types: [
      REQ_MESSAGINGS_PENDING,
      REQ_MESSAGINGS_SUCCESS,
      REQ_MESSAGINGS_ERROR,
    ],
    callAPI: () => API.get(`/messaging/signups/${userId}`),
    shouldCallAPI: (state: RootState) => shouldFetchMessagings(state, userId),
    payload: { userId },
  };
};

export const fetchMessagingsSent = (): APIAction => {
  const userId = getUserId();
  
  return {
    types: [
      REQ_MESSAGINGS_PENDING,
      REQ_MESSAGINGS_SUCCESS,
      REQ_MESSAGINGS_ERROR,
    ],
    callAPI: () => API.get(`/messaging/signupsMessSent/${userId}`),
    shouldCallAPI: (state: RootState) => shouldFetchMessagings(state, userId),
    payload: { userId },
  };
};

export const fetchMessaging = (id: string): APIAction => ({
  types: [
    REQ_MESSAGING_PENDING,
    REQ_MESSAGING_SUCCESS,
    REQ_MESSAGING_ERROR,
  ],
  callAPI: () => API.get(`/messaging/${id}`),
  shouldCallAPI: (state: RootState) => shouldFetchMessage(state, id),
  payload: { id },
});

export const createMessaging = (messaging: Omit<Message, 'id'>): APIAction => {
  const { email, name, message, subject } = messaging;
  
  // Validate required fields
  if (!name?.trim()) {
    throw new Error('Name is required');
  }
  
  if (!email?.trim() || !isValidEmail(email.trim())) {
    throw new Error('Valid email is required');
  }
  
  if (!message?.trim()) {
    throw new Error('Message is required');
  }
  
  if (!subject?.trim()) {
    throw new Error('Subject is required');
  }

  const id = uuidv4();
  
  return {
    types: [
      ADD_MESSAGING_PENDING,
      ADD_MESSAGING_SUCCESS,
      ADD_MESSAGING_ERROR,
    ],
    callAPI: () => API.post('/messaging/', { id, ...messaging }),
    payload: { 
      id,
      messaging: { id, ...messaging } as Message,
    },
  };
};

export const updateMessaging = (messaging: Message): APIAction => {
  const {
    id,
    name,
    email,
    message,
    messageUsersId,
    subject,
    userSent,
  } = messaging;

  // Validate email if provided
  if (email && !isValidEmail(email.trim())) {
    throw new Error('Valid email is required');
  }

  return {
    types: [
      UPDATE_MESSAGING_PENDING,
      UPDATE_MESSAGING_SUCCESS,
      UPDATE_MESSAGING_ERROR,
    ],
    callAPI: () => API.put(`/messaging/${id}`, {
      name: name?.trim(),
      email: email?.trim(),
      message: message?.trim(),
      messageUsersId,
      subject: subject?.trim(),
      userSent,
    }),
    payload: { id },
  };
};

export const deleteMessaging = (id: string): APIAction => ({
  types: [
    DELETE_MESSAGE_PENDING,
    DELETE_MESSAGE_SUCCESS,
    DELETE_MESSAGE_ERROR,
  ],
  callAPI: () => API.delete(`/messaging/${id}`, { params: { id } }),
  payload: { id },
});

export default fetchMessagings;