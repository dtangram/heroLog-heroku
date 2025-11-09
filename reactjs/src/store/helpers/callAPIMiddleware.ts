interface APIResponse {
  data?: object | object[] | string | number | boolean | null;
}

interface ReduxAction {
  type: string;
  [key: string]: string | number | boolean | object | null | undefined | Function;
}

interface APIAction extends ReduxAction {
  types: [string, string, string];
  callAPI: () => Promise<APIResponse>;
  shouldCallAPI?: (state: object) => boolean;
  payload?: Record<string, string | number | boolean | object | null>;
  transformResponse?: (response: APIResponse) => object | object[] | string | number | boolean | null; // Add this
}

interface DispatchAction extends ReduxAction {
  data?: object | object[] | string | number | boolean | null;
  err?: string;
  payload?: Record<string, string | number | boolean | object | null>;
}

const isAPIAction = (action: ReduxAction): action is APIAction => {
  return (
    'types' in action && 
    'callAPI' in action &&
    typeof action.callAPI === 'function'
  );
};

const validateTypes = (types: string | number | boolean | object | null | undefined | Function | [string, string, string]): types is [string, string, string] => {
  if (!Array.isArray(types)) {
    return false;
  }
  
  return (
    types.length === 3 &&
    types.every(type => typeof type === 'string')
  );
};

const extractActionData = (response: APIResponse): object | object[] | string | number | boolean | null => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data !== undefined ? response.data : [];
  }
  return [];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callAPIMiddleware = (store: { dispatch: (action: ReduxAction) => void; getState: () => object }) => 
  (next: (action: ReduxAction) => void) => 
  (action: ReduxAction): void => {
    // If action doesn't have types, it's not an API action - pass it through
    if (!isAPIAction(action)) {
      next(action);
      return;
    }

    const {
      types,
      callAPI,
      shouldCallAPI = () => true,
      payload,
      transformResponse, // Extract transformResponse
      type,
      ...restProps
    } = action;

    // Validate types array
    if (!validateTypes(types)) {
      throw new Error(
        'Expected types to be an array of exactly three strings [REQUEST, SUCCESS, FAILURE]'
      );
    }

    // Validate callAPI function
    if (typeof callAPI !== 'function') {
      throw new Error('Expected callAPI to be a function');
    }

    // Validate shouldCallAPI function
    if (typeof shouldCallAPI !== 'function') {
      throw new Error('Expected shouldCallAPI to be a function');
    }

    // Check if we should call the API
    try {
      const state = store.getState();
      if (!shouldCallAPI(state)) {
        return;
      }
    } catch (error) {
      console.error('Error in shouldCallAPI:', error);
      return;
    }

    // Destructure action types
    const [requestType, successType, failureType] = types;

    // Prepare common action properties
    const actionProps: Record<string, string | number | boolean | object | null | undefined> = {
      ...restProps,
    };
    
    if (payload) {
      actionProps.payload = payload;
    }

    // Dispatch REQUEST action
    store.dispatch({
      ...actionProps,
      type: requestType,
    } as DispatchAction);

    // Call the API asynchronously
    callAPI()
      .then((response) => {
        // Extract data from response
        let data = extractActionData(response);
        
        // Apply transform if provided
        if (transformResponse && typeof transformResponse === 'function') {
          try {
            data = transformResponse(response);
          } catch (transformError) {
            console.error('Error in transformResponse:', transformError);
            // If transform fails, dispatch error
            const errorMessage = transformError instanceof Error 
              ? transformError.message 
              : 'Failed to transform response';
            
            store.dispatch({
              ...actionProps,
              type: failureType,
              err: errorMessage,
            } as DispatchAction);
            return;
          }
        }
        
        // Dispatch SUCCESS action
        store.dispatch({
          ...actionProps,
          type: successType,
          data,
        } as DispatchAction);
      })
      .catch((error) => {
        // Handle error
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unknown error occurred';
        
        console.error('API call failed:', errorMessage);
        
        // Dispatch FAILURE action
        store.dispatch({
          ...actionProps,
          type: failureType,
          err: errorMessage,
        } as DispatchAction);
      });
  };

export default callAPIMiddleware;