import type { RouterOutputs } from './trpc';

export type Feedback = RouterOutputs['feedback']['list'][0];
export type LocationInfo = RouterOutputs['location']['getInfo'];

// Extract component prop types from LocationInfo
export type AirQualityData = Pick<LocationInfo, 'aqi' | 'pm10' | 'pm25'>;
export type GeographyData = Pick<LocationInfo, 'elevation' | 'timezone'>;
export type WeatherData = Pick<LocationInfo, 'temperature' | 'humidity' | 'windSpeed'>;
export type WikipediaArticle = { title: string; url: string; distance?: number };
export type CountryData = Pick<LocationInfo, 'countryName' | 'countryCapital' | 'countryPopulation' | 'countryCurrency' | 'countryLanguages' | 'worldBank'>;