import { describe, it, expect, vi, beforeEach } from 'vitest';
import { locationRouter } from '../routers/location.js';

// Mock Redis
vi.mock('../utils/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null), // Cache miss by default
    setEx: vi.fn().mockResolvedValue('OK')
  }
}));

// Mock API calls
vi.mock('../api/weather.js', () => ({
  fetchWeather: vi.fn().mockResolvedValue({
    elevation: 11,
    timezone: 'Europe/London',
    current: {
      temperature_2m: 15,
      relative_humidity_2m: 70,
      wind_speed_10m: 10
    }
  })
}));

vi.mock('../api/airQuality.js', () => ({
  fetchAirQuality: vi.fn().mockResolvedValue({
    current: {
      european_aqi: 25,
      pm10: 15,
      pm2_5: 8
    }
  })
}));

vi.mock('../api/wikipedia.js', () => ({
  fetchWikipedia: vi.fn().mockResolvedValue([
    { title: 'London', url: 'https://en.wikipedia.org/wiki/London' }
  ])
}));

vi.mock('../api/geocoding.js', () => ({
  fetchReverseGeocode: vi.fn().mockResolvedValue({
    countryCode: 'GB'
  })
}));

vi.mock('../api/country.js', () => ({
  fetchCountryData: vi.fn().mockResolvedValue({
    name: { common: 'United Kingdom' },
    capital: ['London'],
    population: 67000000,
    currencies: { GBP: { name: 'British Pound' } },
    languages: { eng: 'English' }
  })
}));

vi.mock('../api/worldBank.js', () => ({
  fetchWorldBank: vi.fn().mockResolvedValue({
    'NY.GDP.PCAP.CD': 46000,
    'NY.GDP.MKTP.KD.ZG': 2.1
  })
}));

vi.mock('../utils/log.js', () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('Location Router Integration', () => {
  const caller = locationRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInfo', () => {
    it('returns location data with all properties', async () => {
      const result = await caller.getInfo({ lat: 51.5074, lng: -0.1278 });
      
      expect(result).toHaveProperty('elevation', 11);
      expect(result).toHaveProperty('temperature', 15);
      expect(result).toHaveProperty('humidity', 70);
      expect(result).toHaveProperty('windSpeed', 10);
      expect(result).toHaveProperty('timezone', 'Europe/London');
      expect(result).toHaveProperty('aqi', 25);
      expect(result).toHaveProperty('countryName', 'United Kingdom');
      expect(result.wikipedia).toHaveLength(1);
    });

    it('rejects invalid latitude', async () => {
      await expect(
        caller.getInfo({ lat: 91, lng: 0 })
      ).rejects.toThrow();
    });

    it('rejects invalid longitude', async () => {
      await expect(
        caller.getInfo({ lat: 0, lng: 181 })
      ).rejects.toThrow();
    });

    it('uses cache on second call', async () => {
      const { redis } = await import('../utils/redis.js');
      
      // First call - cache miss
      await caller.getInfo({ lat: 51.5074, lng: -0.1278 });
      expect(redis.setEx).toHaveBeenCalled();
      
      // Mock cache hit
      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify({
        elevation: 11,
        temperature: 15
      }));
      
      // Second call - cache hit
      const result = await caller.getInfo({ lat: 51.5074, lng: -0.1278 });
      expect(result).toHaveProperty('elevation', 11);
    });
  });
});
