'use client';

import { useMemo, useState } from 'react';

import {
  buildSearchParams,
  isSearchDisabled,
  type SearchFilters,
} from '../utils/searchParams';

const DEFAULT_FILTERS: SearchFilters = {
  text: '',
  spatialEnabled: false,
  bbox: null,
  timeStart: null,
  timeEnd: null,
  page: 0,
};

export function useSearchFilters() {
  const [text, setText] = useState(DEFAULT_FILTERS.text);
  const [spatialEnabled, setSpatialEnabled] = useState(DEFAULT_FILTERS.spatialEnabled);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(DEFAULT_FILTERS.bbox);
  const [timeStart, setTimeStart] = useState<string | null>(DEFAULT_FILTERS.timeStart);
  const [timeEnd, setTimeEnd] = useState<string | null>(DEFAULT_FILTERS.timeEnd);
  const [page, setPage] = useState(DEFAULT_FILTERS.page);

  const filters: SearchFilters = useMemo(
    () => ({ text, spatialEnabled, bbox, timeStart, timeEnd, page }),
    [text, spatialEnabled, bbox, timeStart, timeEnd, page],
  );

  const isDisabled = useMemo(() => isSearchDisabled(filters), [filters]);
  const searchParams = useMemo(() => buildSearchParams(filters), [filters]);

  const reset = () => {
    setText(DEFAULT_FILTERS.text);
    setSpatialEnabled(DEFAULT_FILTERS.spatialEnabled);
    setBbox(DEFAULT_FILTERS.bbox);
    setTimeStart(DEFAULT_FILTERS.timeStart);
    setTimeEnd(DEFAULT_FILTERS.timeEnd);
    setPage(DEFAULT_FILTERS.page);
  };

  return {
    filters,
    searchParams,
    isDisabled,
    setText,
    setSpatialEnabled,
    setBbox,
    setTimeStart,
    setTimeEnd,
    setPage,
    reset,
  };
}
