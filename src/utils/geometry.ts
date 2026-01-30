/**
 * Geometry utilities for coordinate transformations and spatial calculations
 */

import {TimeSeriesData} from './dataProcessing';

export interface TrackCoordinate {
  lat: number;
  lon: number;
  x: number;
  y: number;
}

export interface TrackMapData {
  coordinates: TrackCoordinate[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    width: number;
    height: number;
  };
}

/**
 * Converts latitude/longitude coordinates to normalized X/Y coordinates for track map visualization
 * Transforms GPS coordinates into a 0-1 normalized coordinate system for rendering
 *
 * @param data - Array of TimeSeriesData points containing lat/lon coordinates
 * @returns TrackMapData with normalized coordinates and bounds, or undefined if no data
 */
export const convertLatLongToXY = (
  data: TimeSeriesData[],
): TrackMapData | undefined => {
  if (!data || data.length === 0) {
    return undefined;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  data.forEach(point => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  });

  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;

  const coordinates: TrackCoordinate[] = data.map(point => ({
    lat: point.lat,
    lon: point.lon,
    x: lonRange > 0 ? (point.lon - minLon) / lonRange : 0.5,
    y: latRange > 0 ? 1 - (point.lat - minLat) / latRange : 0.5,
  }));

  return {
    coordinates,
    bounds: {
      minLat,
      maxLat,
      minLon,
      maxLon,
      width: lonRange,
      height: latRange,
    },
  };
};
