type StateValue = string | number | boolean | object | null;

interface BaseAction {
  type: string;
  [key: string]: StateValue | undefined;
}

type ReducerHandler = (state: object, action: BaseAction) => object;

type ReducerHandlers = Record<string, ReducerHandler>;

const validateInitialState = (state: object | null | undefined): void => {
  if (state === null) {
    throw new Error('Initial state cannot be null');
  }
  
  if (state === undefined) {
    throw new Error('Initial state cannot be undefined');
  }
};

const validateHandlers = (handlers: object | null): handlers is ReducerHandlers => {
  if (!handlers || typeof handlers !== 'object') {
    throw new Error('Handlers must be an object');
  }

  const handlerEntries = Object.entries(handlers);
  
  if (handlerEntries.length === 0) {
    console.warn('Creating reducer with no handlers');
  }

  const invalidHandlers = handlerEntries.filter(
    ([, handler]) => typeof handler !== 'function'
  );

  if (invalidHandlers.length > 0) {
    const invalidTypes = invalidHandlers.map(([type]) => type).join(', ');
    throw new Error(
      `All handlers must be functions. Invalid handlers for: ${invalidTypes}`
    );
  }

  return true;
};

const createReducer = (
  initialState: object,
  handlers: ReducerHandlers
): ((state: object | undefined, action: BaseAction) => object) => {
  // Validate inputs
  validateInitialState(initialState);
  validateHandlers(handlers);

  // Return the reducer function
  return (state: object | undefined, action: BaseAction): object => {
    const currentState = state !== undefined ? state : initialState;
    
    // Ensure action has a type
    if (!action || typeof action.type !== 'string') {
      console.warn('Invalid action dispatched:', action);
      return currentState;
    }

    // Check if handler exists for this action type
    const handler = handlers[action.type];

    if (handler) {
      try {
        // Call the handler and return new state
        return handler(currentState, action);
      } catch (error) {
        console.error(
          `Error in reducer handler for action type "${action.type}":`,
          error
        );
        // Return current state on error to prevent app crash
        return currentState;
      }
    }

    // No handler found, return current state
    return currentState;
  };
};

export default createReducer;