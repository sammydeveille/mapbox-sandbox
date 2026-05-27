import { z } from 'zod';
import { redis } from '../utils/redis';
import { procedure, t } from '../trpc';
import { log } from '../utils/log';

const CACHE_TTL = 86400; // 24 hours

interface WikiSearchResult {
  pageId: number;
  title: string;
  snippet: string;
  url: string;
}

interface WikiPageContent {
  pageId: number;
  title: string;
  extract: string;
  url: string;
  thumbnail?: string;
}

export const wikipediaRouter = t.router({
  search: procedure
    .input(z.object({
      query: z.string().min(1).max(200),
    }))
    .query(async ({ input }): Promise<WikiSearchResult[]> => {
      const cacheKey = `wiki:search:${input.query.toLowerCase().trim()}`;

      const cached = await redis.get(cacheKey);
      if (cached) {
        log.debug('[Cache] Hit:', cacheKey);
        return JSON.parse(cached);
      }

      log.debug('[API] Wikipedia search:', input.query);

      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: input.query,
        srlimit: '10',
        format: 'json',
        origin: '*',
      });

      const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const results: WikiSearchResult[] = (data.query?.search || []).map((item: any) => ({
        pageId: item.pageid,
        title: item.title,
        snippet: item.snippet.replace(/<[^>]*>/g, ''), // strip HTML tags
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      }));

      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(results));
      return results;
    }),

  getPage: procedure
    .input(z.object({
      pageId: z.number(),
    }))
    .query(async ({ input }): Promise<WikiPageContent | null> => {
      const cacheKey = `wiki:page:${input.pageId}`;

      const cached = await redis.get(cacheKey);
      if (cached) {
        log.debug('[Cache] Hit:', cacheKey);
        return JSON.parse(cached);
      }

      log.debug('[API] Wikipedia page:', input.pageId);

      const params = new URLSearchParams({
        action: 'query',
        pageids: String(input.pageId),
        prop: 'extracts|pageimages',
        exintro: '0',
        explaintext: '1',
        exsectionformat: 'plain',
        piprop: 'thumbnail',
        pithumbsize: '400',
        format: 'json',
        origin: '*',
      });

      const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const page = data.query?.pages?.[String(input.pageId)];
      if (!page || page.missing !== undefined) {
        return null;
      }

      const result: WikiPageContent = {
        pageId: page.pageid,
        title: page.title,
        extract: page.extract || '',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        thumbnail: page.thumbnail?.source,
      };

      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    }),
});
