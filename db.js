import { supabase } from './supabase';

const tableMap = {
  User: 'profiles',
  Contract: 'contracts',
  Employee: 'employees',
  Shift: 'shifts',
  Absence: 'absences',
  WhatsappAudit: 'whatsapp_audits',
};

const fieldMap = {
  created_date: 'created_at',
  last_name: 'last_name',
  date: 'date',
};

function getTable(entity) {
  const table = tableMap[entity];

  if (!table) {
    throw new Error(`Entità non configurata: ${entity}`);
  }

  return table;
}

function normalizeOrder(order) {
  if (!order) return null;

  const descending = order.startsWith('-');
  const field = descending ? order.slice(1) : order;

  return {
    field: fieldMap[field] || field,
    ascending: !descending,
  };
}

function createEntityApi(entity) {
  const table = getTable(entity);

  return {
    async list(order) {
      let query = supabase.from(table).select('*');

      const sorting = normalizeOrder(order);

      if (sorting) {
        query = query.order(sorting.field, {
          ascending: sorting.ascending,
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },

    async filter(filters = {}) {
      let query = supabase.from(table).select('*');

      Object.entries(filters).forEach(([key, value]) => {
        const field = fieldMap[key] || key;

        if (Array.isArray(value)) {
          query = query.in(field, value);
        } else if (value === null) {
          query = query.is(field, null);
        } else {
          query = query.eq(field, value);
        }
      });

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    },

    async create(record) {
      const { data, error } = await supabase
        .from(table)
        .insert(record)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    async update(id, patch) {
      const { data, error } = await supabase
        .from(table)
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {};
    },

    async bulkCreate(records) {
      if (!records?.length) return [];

      const { data, error } = await supabase
        .from(table)
        .insert(records)
        .select();

      if (error) throw error;

      return data || [];
    },

    async bulkUpdate(updates) {
      if (!updates?.length) return [];

      const results = [];

      for (const item of updates) {
        const { id, ...patch } = item;

        const { data, error } = await supabase
          .from(table)
          .update(patch)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        results.push(data);
      }

      return results;
    },

    async deleteMany(filter) {
      let query = supabase.from(table).delete();

      if (filter?.id?.$in) {
        query = query.in('id', filter.id.$in);
      }

      const { error } = await query;

      if (error) throw error;

      return {};
    },
  };
}

const entities = new Proxy(
  {},
  {
    get: (_, entity) => createEntityApi(entity),
  }
);

const auth = {
  async isAuthenticated() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return !!session;
  },

  async me() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return null;

    return user;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    return data;
  },

  async loginWithProvider(provider, returnTo = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${returnTo}`,
      },
    });

    if (error) throw error;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  },
};

const users = {
  async inviteUser(email) {
    const { data, error } = await supabase.auth.signUp({
      email,
    });

    if (error) throw error;

    return data;
  },
};

const integrations = {
  Core: {
    async UploadFile() {
      throw new Error('UploadFile non ancora configurato con Supabase Storage.');
    },
  },
};

const db = {
  auth,
  users,
  entities,
  integrations,
};

export default db;
export { db };