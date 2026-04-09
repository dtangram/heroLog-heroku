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
  transformResponse?: (response: APIResponse) => object | object[] | string | number | boolean | null;
}

interface DispatchAction extends ReduxAction {
  data?: object | object[] | string | number | boolean | null;
  err?: string | Array<{ field: string; message: string }>;  // ✅ Allow array
  payload?: Record<string, string | number | boolean | object | null>;
}

interface AxiosError extends Error {
  response?: {
    data?: {
      error?: string;
      errors?: Array<{ field: string; message: string }> | string[];
      message?: string;
    };
    status?: number;
  };
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

// ✅ Updated to preserve error structure
const extractErrorFromResponse = (error: AxiosError | Error): string | Array<{ field: string; message: string }> => {
  if ('response' in error && error.response?.data) {
    const responseData = error.response.data;
    
    // API returns { errors: [{ field, message }, ...] }
    if (responseData.errors && Array.isArray(responseData.errors)) {
      // Check if it's array of objects with field/message
      if (responseData.errors.length > 0 && typeof responseData.errors[0] === 'object') {
        return responseData.errors as Array<{ field: string; message: string }>;
      }
      // Array of strings
      return responseData.errors.join(', ');
    }
    
    // API returns { error: "message" }
    if (responseData.error) {
      return responseData.error;
    }
    
    // API returns { message: "message" }
    if (responseData.message) {
      return responseData.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};

const callAPIMiddleware = (store: { dispatch: (action: ReduxAction) => void; getState: () => object }) => 
  (next: (action: ReduxAction) => void) => 
  (action: ReduxAction): void => {
    if (!isAPIAction(action)) {
      next(action);
      return;
    }

    const {
      types,
      callAPI,
      shouldCallAPI = () => true,
      payload,
      transformResponse,
      type,
      ...restProps
    } = action;

    if (!validateTypes(types)) {
      throw new Error(
        'Expected types to be an array of exactly three strings [REQUEST, SUCCESS, FAILURE]'
      );
    }

    if (typeof callAPI !== 'function') {
      throw new Error('Expected callAPI to be a function');
    }

    if (typeof shouldCallAPI !== 'function') {
      throw new Error('Expected shouldCallAPI to be a function');
    }

    try {
      const state = store.getState();
      if (!shouldCallAPI(state)) {
        return;
      }
    } catch (error) {
      console.error('Error in shouldCallAPI:', error);
      return;
    }

    const [requestType, successType, failureType] = types;

    const actionProps: Record<string, string | number | boolean | object | null | undefined> = {
      ...restProps,
    };
    
    if (payload) {
      actionProps.payload = payload;
    }

    store.dispatch({
      ...actionProps,
      type: requestType,
    } as DispatchAction);

    callAPI()
      .then((response) => {
        let data = extractActionData(response);
        
        if (transformResponse && typeof transformResponse === 'function') {
          try {
            data = transformResponse(response);
          } catch (transformError) {
            console.error('Error in transformResponse:', transformError);
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
        
        store.dispatch({
          ...actionProps,
          type: successType,
          data,
        } as DispatchAction);
      })
      .catch((error) => {
        // ✅ Use updated function that preserves error structure
        const errorData = extractErrorFromResponse(error as AxiosError);
        
        console.error('API call failed:', errorData);
        
        store.dispatch({
          ...actionProps,
          type: failureType,
          err: errorData,  // ✅ Can be string OR array of { field, message }
        } as DispatchAction);
      });
  };

export default callAPIMiddleware;