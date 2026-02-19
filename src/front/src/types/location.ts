export interface AirQualityData {
  aqi?: number;
  pm10?: number;
  pm25?: number;
}

export interface GeographyData {
  elevation?: number;
  timezone?: string;
}

export interface WeatherData {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
}

export interface WikipediaArticle {
  title: string;
  url: string;
}

export interface WorldBankData {
  gdpPerCapita?: number;
  gdpGrowth?: number;
  unemployment?: number;
  exports?: number;
  imports?: number;
  lifeExpectancy?: number;
  infantMortality?: number;
  literacyRate?: number;
  populationGrowth?: number;
  urbanPopulation?: number;
  co2Emissions?: number;
  renewableEnergy?: number;
  internetUsers?: number;
}

export interface CountryData {
  countryName?: string;
  countryCapital?: string;
  countryPopulation?: number;
  countryCurrency?: string;
  countryLanguages?: string;
  worldBank?: WorldBankData;
}

export interface LocationData extends AirQualityData, GeographyData, WeatherData, CountryData {
  wikipedia?: WikipediaArticle[];
}
