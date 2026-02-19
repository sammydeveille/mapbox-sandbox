import type { LocationInfo } from './router';

export type AirQualityData = Pick<LocationInfo, 'aqi' | 'pm10' | 'pm25'>;
export type CountryData = Pick<LocationInfo, 'countryName' | 'countryCapital' | 'countryPopulation' | 'countryCurrency' | 'countryLanguages' | 'worldBank'>;
export type GeographyData = Pick<LocationInfo, 'elevation' | 'timezone'>;
export type WeatherData = Pick<LocationInfo, 'temperature' | 'humidity' | 'windSpeed'>;
export type WikipediaArticle = { title: string; url: string; distance?: number };