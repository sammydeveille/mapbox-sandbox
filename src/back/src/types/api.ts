export interface CountryResponse {
  name: { common: string };
  capital?: string[];
  population?: number;
  currencies?: Record<string, { name: string }>;
  languages?: Record<string, string>;
}

export interface AirQualityResponse {
  current?: {
    european_aqi?: number;
    pm10?: number;
    pm2_5?: number;
  };
}

export interface ReverseGeocodeResponse {
  countryCode?: string;
}

export interface WeatherResponse {
  elevation: number;
  timezone: string;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
}

export interface WikipediaResponse {
  query?: {
    geosearch?: Array<{
      title: string;
      dist: number;
    }>;
  };
}

