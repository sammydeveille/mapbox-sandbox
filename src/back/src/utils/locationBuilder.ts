import type { LocationInfo, WorldBankData } from '../types/location';

export function buildLocationInfo(
  weather: any,
  airQuality: any,
  wikipedia: any,
  country: any,
  worldBank: any
): LocationInfo {
  return {
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
    countryCurrency: (Object.values(country?.currencies || {}) as any)?.[0]?.name,
    countryLanguages: Object.values(country?.languages || {}).join(', '),
    worldBank: buildWorldBankData(worldBank),
    wikipedia,
  };
}

function buildWorldBankData(worldBank: any): WorldBankData {
  return {
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
  };
}