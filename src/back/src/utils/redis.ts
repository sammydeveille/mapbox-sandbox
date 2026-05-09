import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export const getRedis = async () => {
  if (!client) {
    const host = process.env.REDIS_HOST || (process.env.NODE_ENV === 'test' ? 'localhost' : 'redis');
    client = createClient({
      url: `redis://${host}:${process.env.REDIS_PORT || 6379}`
    });
    
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
  }
  return client;
};

export const redis = {
  get: async (key: string) => (await getRedis()).get(key),
  setEx: async (key: string, seconds: number, value: string) => (await getRedis()).setEx(key, seconds, value),
  del: async (key: string | string[]) => {
    const client = await getRedis();
    if (Array.isArray(key)) {
      if (key.length === 0) return 0;
      return client.del(key);
    }
    return client.del(key);
  },
  scan: async (cursor: string, options: { MATCH: string; COUNT: number }) => {
    const client = await getRedis();
    return client.scan(cursor, options);
  },
};
