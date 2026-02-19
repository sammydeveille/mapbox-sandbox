import type { LocationInfo, WorldBankData } from '../types/location';
import type { WeatherResponse, AirQualityResponse, CountryResponse } from '../types/api';

export function buildLocationInfo(
  weather: WeatherResponse,
  airQuality: AirQualityResponse,
  wikipedia: any,
  country: CountryResponse | null,
  worldBank: Record<string, number>
): LocationInfo {
  return {
    aqi: airQuality.current?.european_aqi,
    countryName: country?.name?.common,
    countryCapital: country?.capital?.[0],
    countryPopulation: country?.population,
    countryCurrency: (Object.values(country?.currencies || {}) as any)?.[0]?.name,
    countryLanguages: Object.values(country?.languages || {}).join(', '),
    elevation: weather.elevation,
    humidity: weather.current.relative_humidity_2m,
    pm10: airQuality.current?.pm10,
    pm25: airQuality.current?.pm2_5,
    temperature: weather.current.temperature_2m,
    timezone: weather.timezone,
    wikipedia,
    windSpeed: weather.current.wind_speed_10m,
    worldBank: buildWorldBankData(worldBank),
  };
}

function buildWorldBankData(worldBank: Record<string, number>): WorldBankData {
  return {
    co2Emissions: worldBank['EN.ATM.CO2E.PC'],
    exports: worldBank['NE.EXP.GNFS.ZS'],
    gdpPerCapita: worldBank['NY.GDP.PCAP.CD'],
    gdpGrowth: worldBank['NY.GDP.MKTP.KD.ZG'],
    imports: worldBank['NE.IMP.GNFS.ZS'],
    infantMortality: worldBank['SH.DYN.MORT'],
    internetUsers: worldBank['IT.NET.USER.ZS'],
    lifeExpectancy: worldBank['SP.DYN.LE00.IN'],
    literacyRate: worldBank['SE.ADT.LITR.ZS'],
    populationGrowth: worldBank['SP.POP.GROW'],
    renewableEnergy: worldBank['EG.FEC.RNEW.ZS'],
    unemployment: worldBank['SL.UEM.TOTL.ZS'],
    urbanPopulation: worldBank['SP.URB.TOTL.IN.ZS'],
  };
}