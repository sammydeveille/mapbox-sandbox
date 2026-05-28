export interface ViewState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing?: number;
  pitch?: number;
  temporalStart?: string; // ISO 8601
  temporalEnd?: string;   // ISO 8601
}

export interface FlyToParams {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

/**
 * Maps a ViewState object to flyTo parameters for Mapbox GL.
 *
 * Center and zoom are passed through directly. Bearing defaults to 0
 * when absent, and pitch defaults to 0 when absent.
 *
 * @param viewState - The view state containing map camera configuration
 * @returns An object with center, zoom, bearing, and pitch suitable for map.flyTo()
 */
export function mapViewStateToFlyTo(viewState: ViewState): FlyToParams {
  return {
    center: viewState.center,
    zoom: viewState.zoom,
    bearing: viewState.bearing ?? 0,
    pitch: viewState.pitch ?? 0,
  };
}
