import createReducer from '../helpers/createReducer';
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

export interface State {
  [userId: string]: MessagingsState;
}

interface Action {
  type: string;
  payload?: {
    userId?: string;
    id?: string;
    messaging?: Message;
  };
  data?: Message | Message[];
  err?: string;
}

const initialUserState: MessagingsState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const initialState: State = {};

const getUserState = (state: State, userId: string): MessagingsState =>
  state[userId] || initialUserState;

const findUserIdByMessageId = (state: State, id: string): string | null => {
  const userIds = Object.keys(state);
  
  for (const userId of userIds) {
    const userState = state[userId];
    if (userState?.byId?.[id]) {
      return userId;
    }
  }
  
  return null;
};

const createMessageState = (
  data: Message,
  isLoading = false
): MessageState => ({
  data,
  isLoading,
  loadedAt: Date.now(),
  error: null,
});

const updateMessageInState = (
  byId: Record<string, MessageState>,
  id: string,
  updates: Partial<MessageState>
): Record<string, MessageState> => {
  const existingMessage = byId[id];
  
  if (!existingMessage) {
    return byId;
  }
  
  return {
    ...byId,
    [id]: {
      ...existingMessage,
      ...updates,
    },
  };
};

// Fetch all messages for a user - PENDING
const messagingsPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  
  if (!userId) return typedState;
  
  const userState = getUserState(typedState, userId);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      isLoading: true,
      error: null,
    },
  };
};

// Fetch all messages for a user - SUCCESS
const messagingsSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  
  if (!userId) return typedState;
  
  const messages = Array.isArray(typedAction.data) ? typedAction.data : [];
  const userState = getUserState(typedState, userId);
  const now = Date.now();

  const newById = messages.reduce((acc, message) => ({
    ...acc,
    [message.id]: createMessageState(message),
  }), userState.byId);

  const newAllIds = Array.from(new Set([
    ...userState.allIds,
    ...messages.map(message => message.id),
  ]));

  return {
    ...typedState,
    [userId]: {
      byId: newById,
      allIds: newAllIds,
      loadedAt: now,
      isLoading: false,
      error: null,
    },
  };
};

// Fetch all messages for a user - ERROR
const messagingsError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  
  if (!userId) return typedState;
  
  const userState = getUserState(typedState, userId);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      isLoading: false,
      error: typedAction.err || 'Unknown error',
    },
  };
};

// Fetch/Create/Update single message - PENDING
const messagingPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', messaging } = typedAction.payload || {};
  
  const userId = messaging?.userId || findUserIdByMessageId(typedState, id);

  if (!userId) return typedState;

  const userState = getUserState(typedState, userId);
  const existingMessage = userState.byId[id];
  const messageData = existingMessage?.data || messaging || {
    id,
    name: '',
    email: '',
    message: '',
    messageUsersId: '',
    subject: '',
    userSent: '',
    userId,
  } as Message;

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: {
        ...userState.byId,
        [id]: {
          data: messageData,
          isLoading: true,
          loadedAt: existingMessage?.loadedAt || 0,
          error: null,
        },
      },
    },
  };
};

// Fetch/Create single message - SUCCESS
const messagingSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  const message = typedAction.data as Message;
  
  if (!message?.userId) return typedState;
  
  const { userId } = message;
  const userState = getUserState(typedState, userId);
  const existingData = userState.byId[id]?.data || {};

  const newAllIds = userState.allIds.includes(id)
    ? userState.allIds
    : [...userState.allIds, id];

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: {
        ...userState.byId,
        [id]: createMessageState({ ...existingData, ...message }),
      },
      allIds: newAllIds,
    },
  };
};

// Update single message - SUCCESS
const messagingSuccessUpdate = (state: object, action: object): object =>
  messagingSuccess(state, action);

// Delete single message - SUCCESS
const messagingSuccessDelete = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  const userId = findUserIdByMessageId(typedState, id);
  
  if (!userId) return typedState;

  const userState = typedState[userId];
  const { [id]: _deleted, ...remainingById } = userState.byId;
  const newAllIds = userState.allIds.filter(messageId => messageId !== id);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: remainingById,
      allIds: newAllIds,
    },
  };
};

// Fetch/Create/Update/Delete single message - ERROR
const messagingError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', messaging } = typedAction.payload || {};
  
  const userId = messaging?.userId || findUserIdByMessageId(typedState, id);
  
  if (!userId) return typedState;

  const userState = typedState[userId];
  
  if (!userState?.byId?.[id]) return typedState;

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: updateMessageInState(userState.byId, id, {
        isLoading: false,
        error: typedAction.err || 'Unknown error',
      }),
    },
  };
};

const reducer = createReducer(initialState, {
  [REQ_MESSAGINGS_PENDING]: messagingsPending,
  [REQ_MESSAGINGS_SUCCESS]: messagingsSuccess,
  [REQ_MESSAGINGS_ERROR]: messagingsError,
  [REQ_MESSAGING_PENDING]: messagingPending,
  [REQ_MESSAGING_SUCCESS]: messagingSuccess,
  [REQ_MESSAGING_ERROR]: messagingError,
  [ADD_MESSAGING_PENDING]: messagingPending,
  [ADD_MESSAGING_SUCCESS]: messagingSuccess,
  [ADD_MESSAGING_ERROR]: messagingError,
  [UPDATE_MESSAGING_PENDING]: messagingPending,
  [UPDATE_MESSAGING_SUCCESS]: messagingSuccessUpdate,
  [UPDATE_MESSAGING_ERROR]: messagingError,
  [DELETE_MESSAGE_PENDING]: messagingPending,
  [DELETE_MESSAGE_SUCCESS]: messagingSuccessDelete,
  [DELETE_MESSAGE_ERROR]: messagingError,
});

export default reducer as (state: State | undefined, action: Action) => State;