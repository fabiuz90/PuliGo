const db = globalThis.__PULIGO_DB__ || {
  auth: {
    isAuthenticated: async () => false,
    me: async () => null,
  },
  entities: new Proxy(
    {},
    {
      get: () => ({
        list: async () => [],
        filter: async () => [],
        get: async () => null,
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
        bulkCreate: async () => [],
        bulkUpdate: async () => [],
        deleteMany: async () => ({}),
      }),
    }
  ),
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
    },
  },
};

export default db;
export { db };
