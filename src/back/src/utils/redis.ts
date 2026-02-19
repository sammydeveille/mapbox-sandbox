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
};
