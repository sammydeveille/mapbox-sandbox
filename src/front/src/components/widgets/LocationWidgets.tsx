import { Widget, WidgetItem } from './Widget';
import { AirQualityData, GeographyData, WeatherData, WikipediaArticle, CountryData } from '../../types/location';

export function AirQualityWidget({ aqi, pm10, pm25 }: AirQualityData) {
  if (!aqi && !pm10 && !pm25) return null;
  
  return (
    <Widget title="Air Quality" icon="🌫️">
      {aqi && <WidgetItem label="AQI" value={aqi} />}
      {pm25 && <WidgetItem label="PM2.5" value={`${pm25} µg/m³`} />}
      {pm10 && <WidgetItem label="PM10" value={`${pm10} µg/m³`} />}
    </Widget>
  );
}

export function GeographyWidget({ elevation, timezone }: GeographyData) {
  if (!elevation && !timezone) return null;
  
  return (
    <Widget title="Geography" icon="🗺️">
      {elevation && <WidgetItem label="Elevation" value={`${elevation}m`} />}
      {timezone && <WidgetItem label="Timezone" value={timezone} />}
    </Widget>
  );
}

export function WeatherWidget({ temperature, humidity, windSpeed }: WeatherData) {
  if (!temperature && !humidity && !windSpeed) return null;
  
  return (
    <Widget title="Weather" icon="🌤️">
      {temperature && <WidgetItem label="Temperature" value={`${temperature}°C`} />}
      {humidity && <WidgetItem label="Humidity" value={`${humidity}%`} />}
      {windSpeed && <WidgetItem label="Wind Speed" value={`${windSpeed} km/h`} />}
    </Widget>
  );
}

export function WikipediaWidget({ articles, onOpenViewer }: { articles?: WikipediaArticle[]; onOpenViewer: (url: string, title: string, source: string) => void }) {
  if (!articles || articles.length === 0) return null;
  
  return (
    <Widget title="Wikipedia" icon="📚">
      {articles.map((article) => (
        <button
          key={article.title}
          onClick={() => onOpenViewer(article.url, article.title, 'Wikipedia')}
          className="text-blue-500 hover:underline text-left block"
        >
          {article.title}
        </button>
      ))}
    </Widget>
  );
}

export function CountryWidget({ countryName, countryCapital, countryPopulation, countryCurrency, countryLanguages, worldBank }: CountryData) {
  const hasBasicInfo = countryName || countryCapital || countryPopulation || countryCurrency || countryLanguages;
  if (!hasBasicInfo && !worldBank) return null;
  
  return (
    <Widget title="Country Info" icon="🌍">
      {countryName && <WidgetItem label="Country" value={countryName} />}
      {countryCapital && <WidgetItem label="Capital" value={countryCapital} />}
      {countryPopulation && <WidgetItem label="Population" value={countryPopulation.toLocaleString()} />}
      {countryCurrency && <WidgetItem label="Currency" value={countryCurrency} />}
      {countryLanguages && <WidgetItem label="Languages" value={countryLanguages} />}

      {worldBank && (
        <>
          {(worldBank.gdpPerCapita || worldBank.gdpGrowth) && (
            <Widget title="Economy" icon="💰" collapsible>
              {worldBank.gdpPerCapita && <WidgetItem label="GDP per Capita" value={`$${worldBank.gdpPerCapita.toLocaleString(undefined, {maximumFractionDigits: 0})}`} />}
              {worldBank.gdpGrowth && <WidgetItem label="GDP Growth" value={`${worldBank.gdpGrowth.toFixed(2)}%`} />}
            </Widget>
          )}

          {(worldBank.unemployment || worldBank.exports || worldBank.imports) && (
            <Widget title="Employment & Trade" icon="💼" collapsible>
              {worldBank.unemployment && <WidgetItem label="Unemployment" value={`${worldBank.unemployment.toFixed(1)}%`} />}
              {worldBank.exports && <WidgetItem label="Exports" value={`${worldBank.exports.toFixed(1)}% of GDP`} />}
              {worldBank.imports && <WidgetItem label="Imports" value={`${worldBank.imports.toFixed(1)}% of GDP`} />}
            </Widget>
          )}

          {(worldBank.lifeExpectancy || worldBank.infantMortality || worldBank.literacyRate) && (
            <Widget title="Health & Education" icon="🏥" collapsible>
              {worldBank.lifeExpectancy && <WidgetItem label="Life Expectancy" value={`${worldBank.lifeExpectancy.toFixed(1)} years`} />}
              {worldBank.infantMortality && <WidgetItem label="Infant Mortality" value={`${worldBank.infantMortality.toFixed(1)} per 1,000`} />}
              {worldBank.literacyRate && <WidgetItem label="Literacy Rate" value={`${worldBank.literacyRate.toFixed(1)}%`} />}
            </Widget>
          )}

          {(worldBank.populationGrowth || worldBank.urbanPopulation) && (
            <Widget title="Population" icon="👥" collapsible>
              {worldBank.populationGrowth && <WidgetItem label="Population Growth" value={`${worldBank.populationGrowth.toFixed(2)}%`} />}
              {worldBank.urbanPopulation && <WidgetItem label="Urban Population" value={`${worldBank.urbanPopulation.toFixed(1)}%`} />}
            </Widget>
          )}

          {(worldBank.co2Emissions || worldBank.renewableEnergy) && (
            <Widget title="Environment" icon="🌱" collapsible>
              {worldBank.co2Emissions && <WidgetItem label="CO2 Emissions" value={`${worldBank.co2Emissions.toFixed(2)} tons per capita`} />}
              {worldBank.renewableEnergy && <WidgetItem label="Renewable Energy" value={`${worldBank.renewableEnergy.toFixed(1)}%`} />}
            </Widget>
          )}

          {worldBank.internetUsers && (
            <Widget title="Technology" icon="💻" collapsible>
              <WidgetItem label="Internet Users" value={`${worldBank.internetUsers.toFixed(1)}%`} />
            </Widget>
          )}
        </>
      )}
    </Widget>
  );
}
