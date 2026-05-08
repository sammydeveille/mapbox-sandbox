'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { useAppShell } from './AppShell';
import { geocodeLocation } from '@/app/actions';
import { AirQualityWidget, GeographyWidget, WeatherWidget, WikipediaWidget, CountryWidget } from './widgets/LocationWidgets';
import type { LocationInfo } from '@/types/router';

export function Home() {
  const { onLocationSearch, onOpenViewer } = useAppShell();
  const trpc = useTRPC();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationInfo | null>(null);
  const getLocationInfo = useMutation(trpc.location.getInfo.mutationOptions());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    try {
      const result = await geocodeLocation(search);

      if (result) {
        onLocationSearch(result.lng, result.lat);
        const locationInfo = await getLocationInfo.mutateAsync({ lat: result.lat, lng: result.lng });
        setLocationData(locationInfo);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-bg-secondary p-4 rounded-lg mb-6">
        <h1>Search</h1>
      </div>
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter location..."
            className="w-full border rounded px-4 py-2 dark:bg-gray-800 dark:border-gray-700 bg-bg-secondary border-gray-300 dark:border-gray-600"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !search.trim()}
          className={`px-4 py-2 rounded transition-colors ${
            search.trim() && !loading
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-bg-secondary opacity-50 cursor-not-allowed'
          }`}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {locationData && (
        <div className="mt-6 space-y-4">
          <AirQualityWidget aqi={locationData.aqi} pm10={locationData.pm10} pm25={locationData.pm25} />
          <CountryWidget
            countryName={locationData.countryName}
            countryCapital={locationData.countryCapital}
            countryPopulation={locationData.countryPopulation}
            countryCurrency={locationData.countryCurrency}
            countryLanguages={locationData.countryLanguages}
            worldBank={locationData.worldBank}
          />
          <GeographyWidget elevation={locationData.elevation} timezone={locationData.timezone} />
          <WeatherWidget temperature={locationData.temperature} humidity={locationData.humidity} windSpeed={locationData.windSpeed} />
          <WikipediaWidget articles={locationData.wikipedia} onOpenViewer={onOpenViewer} />
        </div>
      )}
    </div>
  );
}
