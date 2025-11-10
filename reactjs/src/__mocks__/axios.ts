interface MockResponse<T = any> {
  data: T;
}

interface MockAxiosStatic {
  create: jest.Mock<MockAxiosStatic>;
  get: jest.Mock<Promise<MockResponse>>;
  post: jest.Mock<Promise<MockResponse>>;
  put: jest.Mock<Promise<MockResponse>>;
  delete: jest.Mock<Promise<MockResponse>>;
  patch: jest.Mock<Promise<MockResponse>>;
  interceptors: {
    request: {
      use: jest.Mock;
      eject: jest.Mock;
    };
    response: {
      use: jest.Mock;
      eject: jest.Mock;
    };
  };
  defaults: {
    baseURL: string;
    headers: {
      common: Record<string, unknown>;
    };
  };
}

const createMockAxios = (): MockAxiosStatic => {
  const mock = {
    create: jest.fn(),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
    defaults: {
      baseURL: '',
      headers: {
        common: {},
      },
    },
  } as MockAxiosStatic;

  // Now set create to return the mock itself
  mock.create.mockReturnValue(mock);

  return mock;
};

const mockAxios = createMockAxios();

export default mockAxios;