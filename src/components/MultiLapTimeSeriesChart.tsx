import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {Lap} from '@/types';
import {useTelemetry} from '@/hooks/useApiQueries';

const {width} = Dimensions.get('window');

interface TimeSeriesData {
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

interface TrackCoordinate {
  lat: number;
  lon: number;
  x: number;
  y: number;
}

interface TrackMapData {
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

interface NormalizedSeriesData {
  key: string;
  color: string;
  minVal: number;
  maxVal: number;
  range: number;
  normalizedData: Float32Array;
}

interface ProcessedLapData {
  raw: TimeSeriesData[];
  normalized: TimeSeriesData[];
  normalizedSeries: NormalizedSeriesData[];
  totalPoints: number;
  trackMap?: TrackMapData;
}

interface VisibleDataInfo {
  data: TimeSeriesData[];
  startIdx: number;
  endIdx: number;
}

interface MultiLapTimeSeriesChartProps {
  laps: Lap[];
  selectedSeries: string[];
  title?: string;
}

// Parse CSV telemetry data
const parseTelemetryData = (csvText: string): TimeSeriesData[] => {
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

// Convert lat/long to normalized X/Y for track map
const convertLatLongToXY = (
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

// Colors for different laps
const LAP_COLORS = [
  '#FF4444',
  '#44FF44',
  '#4444FF',
  '#FFFF44',
  '#FF44FF',
  '#44FFFF',
  '#FF8844',
  '#8844FF',
  '#44FF88',
  '#FF4488',
];

// Component to handle individual lap telemetry loading
const LapTelemetryLoader: React.FC<{
  lap: Lap;
  onLapCompleted: (lapId: string, data: ProcessedLapData | null) => void;
  lapIndex: number;
  colorArray: string[];
}> = ({lap, onLapCompleted, lapIndex, colorArray}) => {
  const query = useTelemetry(lap.id);
  const hasCompleted = useRef(false);

  useEffect(() => {
    // Prevent duplicate completions
    if (hasCompleted.current) {
      return;
    }

    // Check if query has finished (success or error)
    const isFinished = query.isSuccess || query.isError;

    if (!isFinished) {
      return;
    }

    hasCompleted.current = true;

    try {
      if (query.isSuccess && query.data) {
        const parsedData = parseTelemetryData(query.data);
        if (parsedData.length > 0) {
          const seriesKeys = [
            'brake',
            'throttle',
            'rpm',
            'steeringWheelAngle',
            'speed',
            'gear',
          ] as const;
          const normalizedSeries: NormalizedSeriesData[] = seriesKeys.map(
            seriesKey => {
              const values = new Float32Array(parsedData.length);
              let minVal = Infinity;
              let maxVal = -Infinity;

              for (let i = 0; i < parsedData.length; i++) {
                const val = parsedData[i][seriesKey] as number;
                values[i] = val;
                minVal = Math.min(minVal, val);
                maxVal = Math.max(maxVal, val);
              }

              const range = maxVal - minVal;
              const normalizedValues = new Float32Array(parsedData.length);
              if (range > 0) {
                for (let i = 0; i < parsedData.length; i++) {
                  normalizedValues[i] = (values[i] - minVal) / range;
                }
              }

              return {
                key: seriesKey,
                color: colorArray[lapIndex % colorArray.length],
                minVal,
                maxVal,
                range,
                normalizedData: normalizedValues,
              };
            },
          );

          onLapCompleted(lap.id, {
            raw: parsedData,
            normalized: parsedData,
            normalizedSeries,
            totalPoints: parsedData.length,
            trackMap: convertLatLongToXY(parsedData),
          });
        } else {
          onLapCompleted(lap.id, null);
        }
      } else if (query.isError) {
        onLapCompleted(lap.id, null);
      }
    } catch (error) {
      onLapCompleted(lap.id, null);
    }
  }, [
    query.isSuccess,
    query.isError,
    query.data,
    query.error,
    lap.id,
    lapIndex,
    colorArray,
    onLapCompleted,
  ]);

  return null;
};

export const MultiLapTimeSeriesChart: React.FC<
  MultiLapTimeSeriesChartProps
> = ({laps, selectedSeries, title = 'Multi-Lap Comparison'}) => {
  const [lapDataMap, setLapDataMap] = useState<Map<string, ProcessedLapData>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(3);
  const [showTrackMap, setShowTrackMap] = useState(true);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const referenceLapDataRef = useRef<ProcessedLapData | null>(null);
  const visibleDataCache = useRef<{
    position: number;
    zoomLevel: number;
    totalPoints: number;
    data: TimeSeriesData[];
    startIdx: number;
    endIdx: number;
  } | null>(null);

  // Simple counter-based completion tracking
  const [pendingCount, setPendingCount] = useState(0);

  // Track previous laps to avoid unnecessary resets
  const prevLapsRef = useRef<string>('');
  const currentLapsKey = laps
    .map(lap => lap.id)
    .sort()
    .join(',');

  // Initialize pending count when laps change
  useEffect(() => {
    if (laps.length > 0 && currentLapsKey !== prevLapsRef.current) {
      // Count how many laps don't already have data loaded
      const lapsNeedingLoad = laps.filter(lap => !lapDataMap.has(lap.id));
      const newPendingCount = lapsNeedingLoad.length;

      prevLapsRef.current = currentLapsKey;
      setPendingCount(newPendingCount);

      // Don't reset lapDataMap - keep existing cached data
      // Only set loading if we actually have work to do
      if (newPendingCount > 0) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
    }
  }, [currentLapsKey, laps, lapDataMap]);

  const handleLapCompleted = useCallback(
    (lapId: string, data: ProcessedLapData | null) => {
      // Update data map
      if (data) {
        setLapDataMap(prev => {
          const newMap = new Map(prev);
          newMap.set(lapId, data);
          return newMap;
        });
      }

      // Decrement pending count
      setPendingCount(prev => Math.max(0, prev - 1));
    },
    [],
  );

  // Check if all laps are completed
  useEffect(() => {
    if (pendingCount === 0 && laps.length > 0) {
      setIsLoading(false);
    } else if (pendingCount > 0) {
      setIsLoading(true);
    }
  }, [pendingCount, laps.length]);

  // Use first lap as reference for position/index-based playback (like TimeSeriesChart)
  const referenceLapData = useMemo(() => {
    const result =
      lapDataMap.size === 0 ? null : Array.from(lapDataMap.values())[0];
    // Update ref for animation functions to access current value
    referenceLapDataRef.current = result;
    return result;
  }, [lapDataMap]);

  // Update visible data based on position and zoom level (like TimeSeriesChart)
  const updateVisibleData = useCallback(
    (data: TimeSeriesData[], position: number): number => {
      if (!data || data.length === 0) {
        return 0;
      }
      const totalPoints = data.length;

      // Check cache first
      if (
        visibleDataCache.current &&
        visibleDataCache.current.position === position &&
        visibleDataCache.current.zoomLevel === zoomLevel &&
        visibleDataCache.current.totalPoints === totalPoints
      ) {
        return visibleDataCache.current.startIdx;
      }

      // Calculate the range of data to show based on zoom level
      // Zoom 1-5 maps to 15%-2% of data visible (higher zoom = less data = more zoomed in)
      const dataPercentage = 15 - (zoomLevel - 1) * 3.25; // 15% at zoom 1, 2% at zoom 5
      const pointsToShow = Math.max(
        50,
        Math.floor(totalPoints * (dataPercentage / 100)),
      );

      // Position determines where the leftmost data point is (x=0 = "now")
      // Leftmost (x=0) is always "now", rightmost shows future data
      const startIdx = Math.max(
        0,
        Math.min(totalPoints - pointsToShow, Math.floor(position)),
      );
      const endIdx = Math.min(totalPoints - 1, startIdx + pointsToShow - 1);

      const visiblePoints = data.slice(startIdx, endIdx + 1);

      // Update cache
      visibleDataCache.current = {
        position,
        zoomLevel,
        totalPoints,
        data: visiblePoints,
        startIdx,
        endIdx,
      };

      // Update visible data state
      setVisibleData({data: visiblePoints, startIdx, endIdx});

      return startIdx;
    },
    [zoomLevel],
  );

  // State for visible data (like TimeSeriesChart)
  const [visibleData, setVisibleData] = useState<VisibleDataInfo>({
    data: [],
    startIdx: 0,
    endIdx: 0,
  });

  // Helper functions for position management (like TimeSeriesChart)
  const getCurrentPosition = useCallback(
    (): number => visibleData.startIdx,
    [visibleData.startIdx],
  );

  const updatePosition = useCallback(
    (newPosition: number) => {
      if (referenceLapDataRef.current) {
        updateVisibleData(referenceLapDataRef.current.raw, newPosition);
      }
    },
    [updateVisibleData],
  );

  // Start playback (like TimeSeriesChart)
  const startPlayback = useCallback(() => {
    if (isPlaying || !referenceLapData) {
      return;
    }
    setIsPlaying(true);

    const animate = () => {
      const currentPos = getCurrentPosition();
      let advancement = 1.767; // Base advancement rate (same as TimeSeriesChart)
      advancement *= playbackSpeed;

      const refData = referenceLapDataRef.current;
      if (!refData) {
        return;
      }

      let nextPos = currentPos + advancement;
      if (nextPos >= refData.totalPoints) {
        nextPos = 0; // Loop back to start
      } else if (nextPos < 0) {
        nextPos = refData.totalPoints - 1; // Loop back to end
      }

      updatePosition(nextPos);
    };

    // Use variable interval based on speed
    const animationInterval = 5;

    animationRef.current = setInterval(animate, animationInterval);
  }, [
    isPlaying,
    playbackSpeed,
    getCurrentPosition,
    updatePosition,
    referenceLapData,
  ]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Reset playback
  const resetPlayback = useCallback(() => {
    stopPlayback();
    updatePosition(0);
  }, [stopPlayback, updatePosition]);

  // Restart animation when speed changes during playback
  useEffect(() => {
    if (isPlaying && referenceLapDataRef.current) {
      // Stop current animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Restart with new speed
      const animate = () => {
        const currentPos = getCurrentPosition();
        let advancement = 1.767; // Base advancement rate
        advancement *= playbackSpeed;

        const refData = referenceLapDataRef.current;
        if (!refData) {
          return;
        }

        let nextPos = currentPos + advancement;
        if (nextPos >= refData.totalPoints) {
          nextPos = 0; // Loop back to start
        } else if (nextPos < 0) {
          nextPos = refData.totalPoints - 1; // Loop back to end
        }

        updatePosition(nextPos);
      };

      // Use variable interval based on speed
      const animationInterval = Math.max(10, 30 / Math.abs(playbackSpeed));

      animationRef.current = setInterval(animate, animationInterval);
    }
  }, [
    playbackSpeed,
    isPlaying,
    // Don't depend on referenceLapData - only check if it exists when starting animation
    getCurrentPosition,
    updatePosition,
  ]);

  // Update visible data when zoom level changes (initial position = 0)
  useEffect(() => {
    if (referenceLapDataRef.current) {
      updateVisibleData(referenceLapDataRef.current.raw, 0);
    }
  }, [zoomLevel, updateVisibleData]);

  // Update visible data when zoom changes during playback
  useEffect(() => {
    if (isPlaying && referenceLapData) {
      // Stop current animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Restart with new speed
      const animate = () => {
        const currentPos = getCurrentPosition();
        let advancement = 1.767; // Base advancement rate
        advancement *= playbackSpeed;

        const refData = referenceLapDataRef.current;
        if (!refData) {
          return;
        }

        let nextPos = currentPos + advancement;
        if (nextPos >= refData.totalPoints) {
          nextPos = 0; // Loop back to start
        } else if (nextPos < 0) {
          nextPos = refData.totalPoints - 1; // Loop back to end
        }

        updatePosition(nextPos);
      };

      // Use variable interval based on speed
      const animationInterval = Math.max(10, 30 / Math.abs(playbackSpeed));

      animationRef.current = setInterval(animate, animationInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    zoomLevel,
    isPlaying,
    // Don't depend on referenceLapData or playbackSpeed - only restart on zoom changes during playback
    getCurrentPosition,
    updatePosition,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // Calculate chart dimensions
  const chartWidth = width - 120;
  const chartHeight = 250;

  // Current position is tracked by currentPosition (index, like TimeSeriesChart)

  // Get track map from first lap (all laps should have same track)
  const trackMap = Array.from(lapDataMap.values())[0]?.trackMap;

  if (laps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No laps selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Render telemetry loaders - these trigger the queries */}
      {laps.map((lap, index) => {
        return (
          <LapTelemetryLoader
            key={lap.id}
            lap={lap}
            onLapCompleted={handleLapCompleted}
            lapIndex={index}
            colorArray={LAP_COLORS}
          />
        );
      })}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>
            Loading telemetry data... ({laps.length - pendingCount}/
            {laps.length} loaded)
          </Text>
        </View>
      )}

      {lapDataMap.size === 0 && !isLoading && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>No telemetry data available</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>
          {title} - {laps.length} Laps
        </Text>
        <View style={styles.seriesSelector}>
          <Text style={styles.seriesLabel}>Data:</Text>
          {[
            {key: 'brake', label: 'Brake'},
            {key: 'throttle', label: 'Throttle'},
            {key: 'rpm', label: 'RPM'},
            {key: 'steeringWheelAngle', label: 'Steering'},
            {key: 'speed', label: 'Speed'},
            {key: 'gear', label: 'Gear'},
          ].map(series => (
            <Text key={series.key} style={styles.seriesLabel}>
              {series.label}
            </Text>
          ))}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.compactControls}>
        <View style={styles.transportBar}>
          <TouchableOpacity style={styles.miniButton} onPress={resetPlayback}>
            <Text style={styles.miniText}>🔄</Text>
          </TouchableOpacity>

          <View style={styles.playbackGroup}>
            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                setPlaybackSpeed(Math.max(-5.0, playbackSpeed - 0.5));
                if (!isPlaying) {
                  startPlayback();
                }
              }}>
              <Text style={styles.miniText}>⏪</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                updatePosition(Math.max(0, getCurrentPosition() - 50));
                if (!isPlaying) {
                  startPlayback();
                }
              }}>
              <Text style={styles.miniText}>⏮️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playButtonMini,
                isPlaying && styles.playButtonActive,
              ]}
              onPress={() => {
                if (isPlaying) {
                  stopPlayback();
                } else {
                  startPlayback();
                }
              }}>
              <Text style={styles.playText}>{isPlaying ? '⏸️' : '▶️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                updatePosition(
                  Math.min(
                    (referenceLapData?.totalPoints || 0) - 1,
                    getCurrentPosition() + 50,
                  ),
                );
                if (!isPlaying) {
                  startPlayback();
                }
              }}>
              <Text style={styles.miniText}>⏭️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                setPlaybackSpeed(Math.min(5.0, playbackSpeed + 0.5));
                if (!isPlaying) {
                  startPlayback();
                }
              }}>
              <Text style={styles.miniText}>⏩</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusGroup}>
            <Text
              style={[
                styles.statusText,
                playbackSpeed < 0 && styles.statusTextReverse,
              ]}>
              {playbackSpeed.toFixed(1)}x
            </Text>
            <Text style={styles.statusText}>
              {Math.round(
                (getCurrentPosition() / (referenceLapData?.totalPoints || 1)) *
                  100,
              )}
              %
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.miniButton, showTrackMap && styles.miniButtonActive]}
            onPress={() => setShowTrackMap(!showTrackMap)}>
            <Text style={styles.miniText}>🗺️</Text>
          </TouchableOpacity>

          <View style={styles.zoomGroup}>
            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => setZoomLevel(Math.max(1, zoomLevel - 1))}>
              <Text style={styles.miniText}>🔍-</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLevelText}>{zoomLevel}</Text>
            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => setZoomLevel(Math.min(5, zoomLevel + 1))}>
              <Text style={styles.miniText}>🔍+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Track Map */}
      {showTrackMap && trackMap && (
        <View style={styles.trackMapContainer}>
          <View style={styles.trackMap}>
            <svg
              width={200}
              height={150}
              style={styles.trackMapSvg}
              viewBox='0 0 200 150'>
              <path
                d={(() => {
                  if (!trackMap || trackMap.coordinates.length < 2) {
                    return '';
                  }

                  let pathData = '';
                  trackMap.coordinates.forEach((coord, index) => {
                    const x = coord.x * 180 + 10;
                    const y = coord.y * 130 + 10;

                    if (index === 0) {
                      pathData += `M ${x} ${y}`;
                    } else {
                      pathData += ` L ${x} ${y}`;
                    }
                  });

                  if (trackMap.coordinates.length > 2) {
                    const firstCoord = trackMap.coordinates[0];
                    const x = firstCoord.x * 180 + 10;
                    const y = firstCoord.y * 130 + 10;
                    pathData += ` L ${x} ${y}`;
                  }

                  return pathData;
                })()}
                stroke='#2196F3'
                strokeWidth={2}
                fill='none'
                strokeLinecap='round'
                strokeLinejoin='round'
              />

              {/* Current position indicator */}
              {(() => {
                if (!trackMap || trackMap.coordinates.length === 0) {
                  return null;
                }

                const currentIndex = Math.floor(getCurrentPosition());
                const currentCoord =
                  trackMap.coordinates[
                    Math.min(currentIndex, trackMap.coordinates.length - 1)
                  ];

                if (!currentCoord) {
                  return null;
                }

                const x = currentCoord.x * 180 + 10;
                const y = currentCoord.y * 130 + 10;

                return (
                  <circle
                    cx={x}
                    cy={y}
                    r={4}
                    fill='#FF5722'
                    stroke='#FFFFFF'
                    strokeWidth={2}
                  />
                );
              })()}
            </svg>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.simpleChart}>
          <View style={styles.yAxis}>
            {[100, 80, 60, 40, 20, 0].map(value => (
              <Text key={value} style={styles.yAxisLabel}>
                {value}%
              </Text>
            ))}
            <View style={styles.yAxisLine} />
          </View>

          <View style={styles.chartArea}>
            <View style={styles.gridLines}>
              {[0, 20, 40, 60, 80, 100].map(value => (
                <View
                  key={`grid-${value}`}
                  style={[
                    styles.gridLine,
                    {top: ((100 - value) / 100) * chartHeight},
                  ]}
                />
              ))}
            </View>

            <View style={styles.lineChart}>
              {Array.from(lapDataMap.entries()).map(([lapId, lapData]) => {
                const lap = laps.find(l => l.id === lapId);
                if (!lap) {
                  return null;
                }

                const lapColor =
                  LAP_COLORS[laps.indexOf(lap) % LAP_COLORS.length];
                // Check if this is the reference lap (first lap in the array)
                const isReferenceLap =
                  laps.length > 0 &&
                  laps[0]?.id === lapId &&
                  lapData === referenceLapData;

                return selectedSeries.map(seriesKey => {
                  const series = lapData.normalizedSeries.find(
                    s => s.key === seriesKey,
                  );
                  if (!series) {
                    return null;
                  }

                  // Use reference lap's visible data points as the frame of reference
                  // For each frame (point) in the reference lap, filter other laps by matching lap distance %
                  const visibleCount = visibleData.data.length;
                  let pathData = '';

                  for (let i = 0; i < visibleCount; i++) {
                    const refPoint = visibleData.data[i];
                    if (!refPoint) {
                      continue;
                    }

                    let normalizedValue: number;
                    let dataIndex: number;

                    if (isReferenceLap) {
                      // For reference lap, use the point directly from visible data
                      dataIndex = visibleData.startIdx + i;
                      normalizedValue = series.normalizedData[dataIndex] || 0;
                    } else {
                      // For other laps, find the closest point at the same lap distance percentage
                      // This filters the other lap's data to match the reference lap's frame
                      let closestIdx = 0;
                      let minDiff = Math.abs(
                        lapData.raw[0].lapDistPct - refPoint.lapDistPct,
                      );

                      for (let j = 1; j < lapData.raw.length; j++) {
                        const diff = Math.abs(
                          lapData.raw[j].lapDistPct - refPoint.lapDistPct,
                        );
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestIdx = j;
                        }
                      }

                      dataIndex = closestIdx;
                      normalizedValue = series.normalizedData[closestIdx] || 0;
                    }

                    // Calculate x position (same for all laps - based on reference lap's frame sequence)
                    const x =
                      visibleCount > 1
                        ? (i / (visibleCount - 1)) * chartWidth
                        : 0;
                    const y = chartHeight - normalizedValue * chartHeight;

                    if (i === 0) {
                      pathData += `M ${x} ${y}`;
                    } else {
                      pathData += ` L ${x} ${y}`;
                    }
                  }

                  return (
                    <View
                      key={`${lapId}-${seriesKey}`}
                      style={styles.svgContainer}>
                      <svg
                        width={chartWidth}
                        height={chartHeight}
                        style={styles.svgChart}>
                        <path
                          d={pathData}
                          stroke={lapColor}
                          strokeWidth={2}
                          fill='none'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          opacity={isReferenceLap ? 1.0 : 0.7}
                        />
                      </svg>
                    </View>
                  );
                });
              })}
            </View>

            <View style={styles.xAxis}>
              {(() => {
                const labels = [];
                const numLabels = 5;

                for (let i = 0; i <= numLabels; i++) {
                  const x = (i / numLabels) * chartWidth;
                  const dataIndex = Math.floor(
                    ((visibleData.data.length - 1) * i) / numLabels,
                  );
                  const dataPoint = visibleData.data[dataIndex];

                  const label =
                    i === 0
                      ? 'Now'
                      : dataPoint
                      ? `${dataPoint.lapDistPct.toFixed(1)}%`
                      : '';

                  labels.push(
                    <Text
                      key={`x-${i}`}
                      style={[styles.xAxisLabel, {left: x - 15}]}>
                      {label}
                    </Text>,
                  );
                }
                return labels;
              })()}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Position:{' '}
          {visibleData.data.length > 0
            ? visibleData.data[0].lapDistPct.toFixed(1)
            : 0}
          % lap
        </Text>
        <Text style={styles.statsText}>
          Laps: {laps.length} | Points:{' '}
          {Array.from(lapDataMap.values())
            .map(l => l.totalPoints)
            .join(', ')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  seriesSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  seriesLabel: {
    color: '#cccccc',
    fontSize: 14,
    marginRight: 8,
  },
  loadingText: {
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  compactControls: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  transportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playbackGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniButton: {
    backgroundColor: '#333',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  miniButtonActive: {
    backgroundColor: '#2196F3',
  },
  miniText: {
    fontSize: 14,
  },
  playButtonMini: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  playButtonActive: {
    backgroundColor: '#FF5722',
  },
  playText: {
    fontSize: 16,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 4,
    minWidth: 35,
    textAlign: 'center',
  },
  statusTextReverse: {
    color: '#ff6b6b',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoomLevelText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  trackMapContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trackMap: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  trackMapSvg: {
    width: 200,
    height: 150,
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  simpleChart: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    width: width - 40,
    height: 320,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    width: '100%',
    height: 250,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#333',
    opacity: 0.3,
  },
  lineChart: {
    position: 'relative',
    width: '100%',
    height: 250,
  },
  svgContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  svgChart: {
    width: '100%',
    height: '100%',
  },
  yAxis: {
    width: 50,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 10,
    height: 250,
  },
  yAxisLine: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#444',
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#cccccc',
    textAlign: 'right',
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  xAxisLabel: {
    position: 'absolute',
    top: 5,
    fontSize: 12,
    color: '#cccccc',
    textAlign: 'center',
    width: 40,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statsText: {
    color: '#cccccc',
    fontSize: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
