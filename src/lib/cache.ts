import { LRUCache } from 'lru-cache';

export const apiCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 10, // 10 minutes
});
