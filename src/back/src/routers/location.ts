import { z } from 'zod';
import { redis } from '../utils/redis';
import { procedure, t } from '../trpc';
import { log } from '../utils/log';
import { fetchAirQuality } from '../api/airQuality';
import { fetchCountryData } from '../api/country';
import { fetchReverseGeocode } from '../api/geocoding';
import { fetchWeather } from '../api/weather';
import { fetchWikipedia } from '../api/wikipedia';
import { fetchWorldBank } from '../api/worldBank';
import { buildLocationInfo } from '../utils/locationBuilder';

import type { AirQualityResponse, CountryResponse, ReverseGeocodeResponse, WeatherResponse } from '../types/api';
import type { LocationInfo } from '../types/location';

const CACHE_TTL = 3600; // 1 hour

export const locationRouter = t.router({
  getInfo: procedure
    .input(z.object({ 
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }))
    .mutation(async ({ input }): Promise<LocationInfo> => {
      const cacheKey = `location:${input.lat.toFixed(4)}:${input.lng.toFixed(4)}`;
      
      const cached = await redis.get(cacheKey);
      if (cached) {
        log.debug('[Cache] Hit:', cacheKey);
        return JSON.parse(cached);
      }

      log.debug('[API] Fetching data for:', input);
      const [airQuality, reverseGeo, weather, wikipedia]: [
        AirQualityResponse,
        ReverseGeocodeResponse,
        WeatherResponse,
        any
      ] = await Promise.all([
        fetchAirQuality(input.lat, input.lng),
        fetchReverseGeocode(input.lat, input.lng),
        fetchWeather(input.lat, input.lng),
        fetchWikipedia(input.lat, input.lng)
      ]);

      if (!weather.current) throw new Error('Invalid weather response');

      let country: CountryResponse | null = null;
      let worldBank: Record<string, number> = {};

      if (reverseGeo?.countryCode) {
        [country, worldBank] = await Promise.all([
          fetchCountryData(reverseGeo.countryCode),
          fetchWorldBank(reverseGeo.countryCode)
        ]);
      }

      const result = buildLocationInfo(weather, airQuality, wikipedia, country, worldBank);

      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
      log.debug('[Cache] Stored:', cacheKey);
      return result;
    }),
});
