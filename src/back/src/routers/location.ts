import { z } from 'zod';
import { redis } from '../utils/redis.js';
import { publicProcedure, t } from '../trpc.js';
import { log } from '../utils/log.js';
import { fetchAirQuality } from '../api/airQuality.js';
import { fetchCountryData } from '../api/country.js';
import { fetchReverseGeocode } from '../api/geocoding.js';
import { fetchWeather } from '../api/weather.js';
import { fetchWikipedia } from '../api/wikipedia.js';
import { fetchWorldBank } from '../api/worldBank.js';

export const locationRouter = t.router({
  getInfo: publicProcedure
    .input(z.object({ 
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }))
    .mutation(async ({ input }) => {
      const cacheKey = `location:${input.lat.toFixed(4)}:${input.lng.toFixed(4)}`;
      
      const cached = await redis.get(cacheKey);
      if (cached) {
        log.debug('[Cache] Hit:', cacheKey);
        return JSON.parse(cached);
      }

      log.debug('[API] Fetching data for:', input);
      const [weather, airQuality, wikipedia, reverseGeo] = await Promise.all([
        fetchWeather(input.lat, input.lng),
        fetchAirQuality(input.lat, input.lng),
        fetchWikipedia(input.lat, input.lng),
        fetchReverseGeocode(input.lat, input.lng)
      ]);

      if (!weather.current) throw new Error('Invalid weather response');

      let country = null;
      let worldBank: any = {};

      if (reverseGeo?.countryCode) {
        [country, worldBank] = await Promise.all([
          fetchCountryData(reverseGeo.countryCode),
          fetchWorldBank(reverseGeo.countryCode)
        ]);
        log.debug('[API] World Bank data:', JSON.stringify(worldBank));
      }

      const result = {
        elevation: weather.elevation,
        temperature: weather.current.temperature_2m,
        humidity: weather.current.relative_humidity_2m,
        windSpeed: weather.current.wind_speed_10m,
        timezone: weather.timezone,
        aqi: airQuality.current?.european_aqi,
        pm10: airQuality.current?.pm10,
        pm25: airQuality.current?.pm2_5,
        countryName: country?.name?.common,
        countryCapital: country?.capital?.[0],
        countryPopulation: country?.population,
        countryCurrency: Object.values(country?.currencies || {})?.[0]?.name,
        countryLanguages: Object.values(country?.languages || {}).join(', '),
        worldBank: {
          gdpPerCapita: worldBank['NY.GDP.PCAP.CD'],
          gdpGrowth: worldBank['NY.GDP.MKTP.KD.ZG'],
          unemployment: worldBank['SL.UEM.TOTL.ZS'],
          exports: worldBank['NE.EXP.GNFS.ZS'],
          imports: worldBank['NE.IMP.GNFS.ZS'],
          lifeExpectancy: worldBank['SP.DYN.LE00.IN'],
          infantMortality: worldBank['SH.DYN.MORT'],
          literacyRate: worldBank['SE.ADT.LITR.ZS'],
          populationGrowth: worldBank['SP.POP.GROW'],
          urbanPopulation: worldBank['SP.URB.TOTL.IN.ZS'],
          co2Emissions: worldBank['EN.ATM.CO2E.PC'],
          renewableEnergy: worldBank['EG.FEC.RNEW.ZS'],
          internetUsers: worldBank['IT.NET.USER.ZS'],
        },
        wikipedia,
      };
      log.debug('[API] Wikipedia articles found:', wikipedia.length);

      await redis.setEx(cacheKey, 3600, JSON.stringify(result));
      log.debug('[Cache] Stored:', cacheKey);
      return result;
    }),
});
