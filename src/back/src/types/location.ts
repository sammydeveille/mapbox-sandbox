export interface LocationInfo {
  elevation: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  timezone: string;
  aqi?: number;
  pm10?: number;
  pm25?: number;
  countryName?: string;
  countryCapital?: string;
  countryPopulation?: number;
  countryCurrency?: string;
  countryLanguages?: string;
  worldBank: WorldBankData;
  wikipedia: any;
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