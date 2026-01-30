/**
 * Data processing utilities for telemetry data parsing and manipulation
 */

export interface TimeSeriesData {
  timestamp: Date;
  lapDistPct: number;
  lat: number;
  lon: number;
  brake: number;
  throttle: number;
  rpm: number;
  steeringWheelAngle: number;
  speed: number;
  gear: number;
}

/**
 * Parses CSV telemetry data into structured TimeSeriesData objects
 *
 * @param csvText - Raw CSV text containing telemetry data
 * @returns Array of parsed TimeSeriesData objects, sorted by lap distance percentage
 */
export const parseTelemetryData = (csvText: string): TimeSeriesData[] => {
  if (!csvText || typeof csvText !== 'string') {
    return [];
  }

  const allLines = csvText
    .split('\n')
    .filter((line: string) => line.trim() !== '');

  if (allLines.length < 2) {
    return []; // Need at least header + 1 data row
  }

  // Parse header
  const headers = allLines[0].split(',').map(h => h.trim());
  const columnIndices = {
    lapDistPct: headers.indexOf('LapDistPct'),
    lat: headers.indexOf('Lat'),
    lon: headers.indexOf('Lon'),
    brake: headers.indexOf('Brake'),
    throttle: headers.indexOf('Throttle'),
    rpm: headers.indexOf('RPM'),
    steering: headers.indexOf('SteeringWheelAngle'),
    speed: headers.indexOf('Speed'),
    gear: headers.indexOf('Gear'),
  };

  const parsedData: TimeSeriesData[] = [];

  // Process data rows
  for (let i = 1; i < allLines.length; i++) {
    const line = allLines[i];
    if (!line.trim()) {
      continue;
    }

    const values = line.split(',');

    // Check if we have enough columns
    const maxIndex = Math.max(...Object.values(columnIndices));
    if (values.length <= maxIndex) {
      continue;
    }

    const lapDistPct = parseFloat(values[columnIndices.lapDistPct]);
    const lat = parseFloat(values[columnIndices.lat]);
    const lon = parseFloat(values[columnIndices.lon]);
    const brake = parseFloat(values[columnIndices.brake]);
    const throttle = parseFloat(values[columnIndices.throttle]);
    const rpm = parseFloat(values[columnIndices.rpm]);
    const steeringWheelAngle = parseFloat(values[columnIndices.steering]);
    const speed = parseFloat(values[columnIndices.speed]);
    const gear = parseFloat(values[columnIndices.gear]);

    if (
      !isNaN(lapDistPct) &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      !isNaN(brake) &&
      !isNaN(throttle) &&
      !isNaN(rpm) &&
      !isNaN(steeringWheelAngle) &&
      !isNaN(speed) &&
      !isNaN(gear)
    ) {
      parsedData.push({
        timestamp: new Date(),
        lapDistPct: lapDistPct * 100, // Convert to percentage
        lat,
        lon,
        brake,
        throttle,
        rpm,
        steeringWheelAngle,
        speed,
        gear,
      });
    }
  }

  // Sort by LapDistPct to ensure proper ordering
  parsedData.sort((a, b) => a.lapDistPct - b.lapDistPct);

  return parsedData;
};
