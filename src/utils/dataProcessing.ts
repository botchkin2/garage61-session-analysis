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
 * Parses CSV telemetry data into structured TimeSeriesData objects with memory optimization
 *
 * @param csvText - Raw CSV text containing telemetry data
 * @param options - Parsing options for memory management
 * @returns Array of parsed TimeSeriesData objects, sorted by lap distance percentage
 */
export const parseTelemetryData = (
  csvText: string,
  options?: {
    maxRows?: number;
    sampleRate?: number; // Keep every Nth row (1 = keep all, 2 = keep every 2nd, etc.)
    validateData?: boolean;
  },
): TimeSeriesData[] => {
  const {maxRows, sampleRate = 1, validateData = true} = options || {};

  if (!csvText || typeof csvText !== 'string') {
    return [];
  }

  console.log(
    `Parsing CSV data: ${(csvText.length / 1024 / 1024).toFixed(2)}MB`,
  );

  // Use a more memory-efficient approach for splitting lines
  const lines = csvText.split('\n');

  // Filter out empty lines in a single pass
  const validLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      validLines.push(line);
    }
  }

  if (validLines.length < 2) {
    return []; // Need at least header + 1 data row
  }

  // Parse header
  const headers = validLines[0].split(',').map(h => h.trim());
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

  // Validate required columns exist
  const requiredColumns = [
    'lapDistPct',
    'lat',
    'lon',
    'brake',
    'throttle',
    'rpm',
    'steering',
    'speed',
    'gear',
  ];
  const missingColumns = requiredColumns.filter(
    col => columnIndices[col as keyof typeof columnIndices] === -1,
  );
  if (missingColumns.length > 0) {
    console.warn('Missing required columns in CSV:', missingColumns);
  }

  // Pre-allocate array with estimated capacity to reduce reallocations
  const estimatedCapacity = Math.min(
    validLines.length - 1,
    maxRows || validLines.length - 1,
  );
  const parsedData: TimeSeriesData[] = new Array(estimatedCapacity);
  let dataIndex = 0;

  // Process data rows with sampling and memory efficiency
  for (
    let i = 1;
    i < validLines.length && (!maxRows || dataIndex < maxRows);
    i++
  ) {
    // Apply sampling rate
    if (sampleRate > 1 && i % sampleRate !== 0) {
      continue;
    }

    const line = validLines[i];
    const values = line.split(',');

    // Quick bounds check
    const maxIndex = Math.max(...Object.values(columnIndices));
    if (values.length <= maxIndex) {
      continue;
    }

    // Parse values efficiently (avoid repeated parseFloat calls)
    const lapDistPct = parseFloat(values[columnIndices.lapDistPct]);
    const lat = parseFloat(values[columnIndices.lat]);
    const lon = parseFloat(values[columnIndices.lon]);
    const brake = parseFloat(values[columnIndices.brake]);
    const throttle = parseFloat(values[columnIndices.throttle]);
    const rpm = parseFloat(values[columnIndices.rpm]);
    const steeringWheelAngle = parseFloat(values[columnIndices.steering]);
    const speed = parseFloat(values[columnIndices.speed]);
    const gear = parseFloat(values[columnIndices.gear]);

    // Validate data if requested
    if (validateData) {
      if (
        isNaN(lapDistPct) ||
        isNaN(lat) ||
        isNaN(lon) ||
        isNaN(brake) ||
        isNaN(throttle) ||
        isNaN(rpm) ||
        isNaN(steeringWheelAngle) ||
        isNaN(speed) ||
        isNaN(gear)
      ) {
        continue; // Skip invalid rows
      }
    }

    // Create data object
    parsedData[dataIndex++] = {
      timestamp: new Date(), // Consider optimizing this if not needed
      lapDistPct: lapDistPct * 100, // Convert to percentage
      lat,
      lon,
      brake,
      throttle,
      rpm,
      steeringWheelAngle,
      speed,
      gear,
    };
  }

  // Trim array to actual size if we over-allocated
  if (dataIndex < parsedData.length) {
    parsedData.length = dataIndex;
  }

  // Sort by LapDistPct to ensure proper ordering (only if we have data)
  if (parsedData.length > 1) {
    parsedData.sort((a, b) => a.lapDistPct - b.lapDistPct);
  }

  console.log(`Parsed ${parsedData.length} telemetry data points`);
  return parsedData;
};

/**
 * Memory-efficient streaming parser for very large CSV files
 * Processes data in chunks to avoid loading everything into memory at once
 *
 * @param csvText - Raw CSV text
 * @param onChunk - Callback for each processed chunk
 * @param chunkSize - Number of rows per chunk
 */
export const parseTelemetryDataStreaming = async (
  csvText: string,
  onChunk: (data: TimeSeriesData[]) => void | Promise<void>,
  chunkSize: number = 1000,
): Promise<void> => {
  if (!csvText || typeof csvText !== 'string') {
    return;
  }

  const lines = csvText.split('\n');
  if (lines.length < 2) {
    return;
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());
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

  let chunk: TimeSeriesData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const maxIndex = Math.max(...Object.values(columnIndices));
    if (values.length <= maxIndex) continue;

    const lapDistPct = parseFloat(values[columnIndices.lapDistPct]);
    const lat = parseFloat(values[columnIndices.lat]);
    const lon = parseFloat(values[columnIndices.lon]);
    const brake = parseFloat(values[columnIndices.brake]);
    const throttle = parseFloat(values[columnIndices.throttle]);
    const rpm = parseFloat(values[columnIndices.rpm]);
    const steeringWheelAngle = parseFloat(values[columnIndices.steering]);
    const speed = parseFloat(values[columnIndices.speed]);
    const gear = parseFloat(values[columnIndices.gear]);

    if (!isNaN(lapDistPct) && !isNaN(lat) && !isNaN(lon)) {
      chunk.push({
        timestamp: new Date(),
        lapDistPct: lapDistPct * 100,
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

    // Process chunk when it reaches the target size
    if (chunk.length >= chunkSize) {
      await onChunk(chunk);
      chunk = [];
    }
  }

  // Process remaining data
  if (chunk.length > 0) {
    await onChunk(chunk);
  }
};
