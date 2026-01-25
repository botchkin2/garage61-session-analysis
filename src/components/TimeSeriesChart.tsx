import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';

const {width} = Dimensions.get('window');

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label: string;
  lapDistPct: number;
  brake: number;
  throttle: number;
  rpm: number;
  steeringWheelAngle: number;
  speed: number;
  gear: number;
}

interface NormalizedSeriesData {
  key: string;
  color: string;
  minVal: number;
  maxVal: number;
  range: number;
  normalizedData: Float32Array; // Use Float32Array for better memory efficiency
}

interface ProcessedData {
  raw: TimeSeriesData[];
  normalized: NormalizedSeriesData[];
  totalPoints: number;
}

interface VisibleDataInfo {
  data: TimeSeriesData[];
  startIdx: number;
  endIdx: number;
}

interface TimeSeriesChartProps {
  title?: string;
  dataPoints?: number;
  animationDuration?: number;
  onDataUpdate?: (data: TimeSeriesData[]) => void;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  title = 'Time Series Data',
  dataPoints = 20,
  onDataUpdate,
}) => {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null,
  );
  const [visibleData, setVisibleData] = useState<VisibleDataInfo>({
    data: [],
    startIdx: 0,
    endIdx: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  // Removed currentPosition state - derived from visibleData.endIdx
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Speed multiplier (-5 to 5, negative = rewind)
  const [zoomLevel, setZoomLevel] = useState(3); // Zoom level 1-5 (higher = more zoomed in/less data)
  const [selectedSeries, setSelectedSeries] = useState<string[]>(['brake']); // Selected data series to display (multi-select)
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Cache for visible data calculations to avoid redundant computations
  const visibleDataCache = useRef<{
    position: number;
    zoomLevel: number;
    totalPoints: number;
    data: TimeSeriesData[];
    startIdx: number;
    endIdx: number;
  } | null>(null);

  // Update visible data based on position and zoom level
  // Returns the new endIdx (current position)
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
        setVisibleData({
          data: visibleDataCache.current.data,
          startIdx: visibleDataCache.current.startIdx,
          endIdx: visibleDataCache.current.endIdx,
        });
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

      setVisibleData({data: visiblePoints, startIdx, endIdx});
      return startIdx;
    },
    [zoomLevel],
  );

  // Fallback data generation for demo charts
  const initializeData = useCallback(() => {
    const baseTime = new Date();
    const initialData: TimeSeriesData[] = [];
    for (let i = 0; i < dataPoints; i++) {
      const lapPct = (i / dataPoints) * 100;
      initialData.push({
        timestamp: baseTime,
        value: Math.random(),
        label: `${lapPct.toFixed(2)}%`,
        lapDistPct: lapPct,
        brake: Math.random(),
        throttle: Math.random(),
        rpm: Math.random() * 10000,
        steeringWheelAngle: Math.random() * 360 - 180,
        speed: Math.random() * 200,
        gear: Math.floor(Math.random() * 6) + 1,
      });
    }
    // Create basic processed data for demo (without complex normalization)
    const processed: ProcessedData = {
      raw: initialData,
      normalized: [], // Skip normalization for demo data
      totalPoints: initialData.length,
    };
    setProcessedData(processed);
    updateVisibleData(initialData, 0);
    onDataUpdate?.(initialData);
  }, [dataPoints, updateVisibleData, onDataUpdate]);

  // Load CSV data with optimized chunked processing
  const loadCsvData = useCallback(async () => {
    try {
      const response = await axios.get('/sample_data/sample_lap.csv');
      const csvText = response.data as string;
      const allLines = csvText
        .split('\n')
        .filter((line: string) => line.trim() !== '');

      // Process in chunks to avoid blocking the main thread
      const CHUNK_SIZE = 1000;
      const totalLines = allLines.length;
      const parsedData: TimeSeriesData[] = [];
      let processedLines = 0;

      // Parse header
      const headers = allLines[0].split(',');
      const columnIndices = {
        lapDistPct: headers.indexOf('LapDistPct'),
        brake: headers.indexOf('Brake'),
        throttle: headers.indexOf('Throttle'),
        rpm: headers.indexOf('RPM'),
        steering: headers.indexOf('SteeringWheelAngle'),
        speed: headers.indexOf('Speed'),
        gear: headers.indexOf('Gear'),
      };

      // Process data in chunks
      for (
        let chunkStart = 1;
        chunkStart < totalLines;
        chunkStart += CHUNK_SIZE
      ) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalLines);
        const chunk = allLines.slice(chunkStart, chunkEnd);

        // Process chunk asynchronously to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 0));

        for (const line of chunk) {
          const values = line.split(',');
          if (
            values.length <
            Object.values(columnIndices).reduce(
              (max, idx) => Math.max(max, idx),
              0,
            ) +
              1
          ) {
            continue;
          }

          const lapDistPct = parseFloat(values[columnIndices.lapDistPct]);
          const brake = parseFloat(values[columnIndices.brake]);
          const throttle = parseFloat(values[columnIndices.throttle]);
          const rpm = parseFloat(values[columnIndices.rpm]);
          const steeringWheelAngle = parseFloat(values[columnIndices.steering]);
          const speed = parseFloat(values[columnIndices.speed]);
          const gear = parseFloat(values[columnIndices.gear]);

          if (
            !isNaN(lapDistPct) &&
            !isNaN(brake) &&
            !isNaN(throttle) &&
            !isNaN(rpm) &&
            !isNaN(steeringWheelAngle) &&
            !isNaN(speed) &&
            !isNaN(gear)
          ) {
            parsedData.push({
              timestamp: new Date(),
              value: brake,
              label: `${(lapDistPct * 100).toFixed(2)}%`,
              lapDistPct: lapDistPct * 100,
              brake,
              throttle,
              rpm,
              steeringWheelAngle,
              speed,
              gear,
            });
          }
        }

        processedLines += chunk.length;
        console.log(
          `Processed ${processedLines}/${totalLines - 1} data points...`,
        );
      }

      // Sort by LapDistPct to ensure proper ordering
      parsedData.sort((a, b) => a.lapDistPct - b.lapDistPct);

      console.log(`Loaded ${parsedData.length} data points from CSV`);

      // Pre-calculate normalized data for all series using Float32Array for memory efficiency
      const seriesKeys = [
        'brake',
        'throttle',
        'rpm',
        'steeringWheelAngle',
        'speed',
        'gear',
      ] as const;
      const seriesColors = {
        brake: '#FF4444',
        throttle: '#44FF44',
        rpm: '#4444FF',
        steeringWheelAngle: '#FFFF44',
        speed: '#FF44FF',
        gear: '#44FFFF',
      };

      const normalizedData: NormalizedSeriesData[] = seriesKeys.map(
        seriesKey => {
          const validDataCount = parsedData.length;
          const values = new Float32Array(validDataCount);
          let minVal = Infinity;
          let maxVal = -Infinity;

          // First pass: find min/max
          for (let i = 0; i < validDataCount; i++) {
            const val = parsedData[i][seriesKey] as number;
            values[i] = val;
            minVal = Math.min(minVal, val);
            maxVal = Math.max(maxVal, val);
          }

          const range = maxVal - minVal;

          // Second pass: normalize
          const normalizedValues = new Float32Array(validDataCount);
          if (range > 0) {
            for (let i = 0; i < validDataCount; i++) {
              normalizedValues[i] = (values[i] - minVal) / range;
            }
          }

          return {
            key: seriesKey,
            color: seriesColors[seriesKey],
            minVal,
            maxVal,
            range,
            normalizedData: normalizedValues,
          };
        },
      );

      const processed: ProcessedData = {
        raw: parsedData,
        normalized: normalizedData,
        totalPoints: parsedData.length,
      };

      setProcessedData(processed);
      updateVisibleData(parsedData, 0);
      onDataUpdate?.(parsedData);
    } catch (error) {
      console.error('Failed to load CSV data, using generated data:', error);
      initializeData();
    }
  }, [updateVisibleData, onDataUpdate, initializeData]);

  // Start playback
  const startPlayback = () => {
    if (isPlaying || !processedData) {
      return;
    }

    setIsPlaying(true);

    const animate = () => {
      const currentPos = getCurrentPosition();
      let advancement = 1.767; // Base advancement rate

      // Manual speed control
      advancement *= playbackSpeed;

      let nextPos = currentPos + advancement;
      if (nextPos >= processedData.totalPoints) {
        nextPos = 0; // Loop back to start
      } else if (nextPos < 0) {
        nextPos = processedData.totalPoints - 1; // Loop back to end
      }

      updatePosition(nextPos);
    };

    // Use variable interval based on speed
    const animationInterval = Math.max(5, 30 / Math.abs(playbackSpeed));

    animationRef.current = setInterval(animate, animationInterval);
  };

  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  };

  // Reset to beginning
  const resetPlayback = () => {
    stopPlayback();
    updatePosition(0);
  };

  useEffect(() => {
    loadCsvData();
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [loadCsvData]);

  // Update visible data when zoom level changes (initial position = 0)
  useEffect(() => {
    if (processedData) {
      updateVisibleData(processedData.raw, 0);
    }
  }, [zoomLevel, processedData, updateVisibleData]);

  // Helper functions for position management
  const getCurrentPosition = useCallback(
    (): number => visibleData.startIdx,
    [visibleData.startIdx],
  );
  const updatePosition = useCallback(
    (newPosition: number) => {
      if (processedData) {
        updateVisibleData(processedData.raw, newPosition);
      }
    },
    [processedData, updateVisibleData],
  );

  // Get selected series data directly from processed data
  const getSelectedSeriesData = useCallback(() => {
    if (!processedData || selectedSeries.length === 0) {
      return [];
    }

    return selectedSeries
      .map(seriesKey => {
        const seriesData = processedData.normalized.find(
          s => s.key === seriesKey,
        );
        return seriesData || null;
      })
      .filter(Boolean);
  }, [processedData, selectedSeries]);

  // No need for complex setup - data is pre-computed

  // Restart animation when speed changes during playback
  useEffect(() => {
    if (isPlaying && processedData) {
      // Stop current animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Restart with new speed
      const animate = () => {
        const currentPos = getCurrentPosition();
        let advancement = 1.767; // Base advancement rate

        // Manual speed control
        advancement *= playbackSpeed;

        let nextPos = currentPos + advancement;
        if (nextPos >= processedData.totalPoints) {
          nextPos = 0; // Loop back to start
        } else if (nextPos < 0) {
          nextPos = processedData.totalPoints - 1; // Loop back to end
        }

        updatePosition(nextPos);
      };

      // Use variable interval based on speed
      const animationInterval = Math.max(10, 30 / Math.abs(playbackSpeed));

      animationRef.current = setInterval(animate, animationInterval);
    }
  });

  // Update visible data when zoom changes during playback
  useEffect(() => {
    if (isPlaying && processedData) {
      // Stop current animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Restart with new speed
      const animate = () => {
        const currentPos = getCurrentPosition();
        let advancement = 1.767; // Base advancement rate

        // Manual speed control
        advancement *= playbackSpeed;

        let nextPos = currentPos + advancement;
        if (nextPos >= processedData.totalPoints) {
          nextPos = 0; // Loop back to start
        } else if (nextPos < 0) {
          nextPos = processedData.totalPoints - 1; // Loop back to end
        }

        updatePosition(nextPos);
      };

      // Use variable interval based on speed
      const animationInterval = Math.max(10, 30 / Math.abs(playbackSpeed));

      animationRef.current = setInterval(animate, animationInterval);
    }
  }, [
    playbackSpeed,
    zoomLevel,
    isPlaying,
    processedData,
    updateVisibleData,
    getCurrentPosition,
    updatePosition,
  ]);

  // Note: Zoom changes during playback are handled automatically by the animation
  // since updateVisibleData uses the current zoomLevel from state

  // Prepare data for display - brake values are 0-1, convert to 0-100% for display
  const displayData = visibleData.data.map(item => ({
    ...item,
    displayValue: item.value * 100, // Convert to percentage for display
  }));

  // Calculate chart dimensions
  const chartWidth = width - 120;
  const chartHeight = 250;

  // Get current "now" position data (x=0 position = "now")
  const currentData = visibleData.data.length > 0 ? visibleData.data[0] : null; // First point is at x=0 ("now")
  const currentLapPct = currentData ? currentData.lapDistPct : 0;

  // Get selected series data for stats display
  const selectedSeriesData = getSelectedSeriesData();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {title} -{' '}
          {selectedSeries.length === 1
            ? selectedSeries[0].charAt(0).toUpperCase() +
              selectedSeries[0].slice(1).replace(/([A-Z])/g, ' $1')
            : `${selectedSeries.length} Series`}
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
          ].map(series => {
            const isSelected = selectedSeries.includes(series.key);
            return (
              <TouchableOpacity
                key={series.key}
                style={[
                  styles.seriesButton,
                  isSelected && styles.seriesButtonActive,
                ]}
                onPress={() => {
                  if (isSelected) {
                    // Remove from selection (but keep at least one)
                    if (selectedSeries.length > 1) {
                      setSelectedSeries(
                        selectedSeries.filter(s => s !== series.key),
                      );
                    }
                  } else {
                    // Add to selection
                    setSelectedSeries([...selectedSeries, series.key]);
                  }
                }}>
                <Text
                  style={[
                    styles.seriesButtonText,
                    isSelected && styles.seriesButtonTextActive,
                  ]}>
                  {isSelected ? '●' : '○'} {series.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Compact Controls */}
      <View style={styles.compactControls}>
        {/* Main Transport Bar */}
        <View style={styles.transportBar}>
          {/* Reset Button */}
          <TouchableOpacity
            style={styles.miniButton}
            onPress={() => {
              resetPlayback();
            }}>
            <Text style={styles.miniText}>🔄</Text>
          </TouchableOpacity>

          {/* Playback Controls */}
          <View style={styles.playbackGroup}>
            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                setPlaybackSpeed(Math.max(-5.0, playbackSpeed - 0.5));
                if (!isPlaying) {
                  startPlayback();
                } // Start playback if not already playing
              }}>
              <Text style={styles.miniText}>⏪</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                updatePosition(Math.max(0, getCurrentPosition() - 50));
                if (!isPlaying) {
                  startPlayback();
                } // Start playback if not already playing
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
                    (processedData?.totalPoints || 0) - 1,
                    getCurrentPosition() + 50,
                  ),
                );
                if (!isPlaying) {
                  startPlayback();
                } // Start playback if not already playing
              }}>
              <Text style={styles.miniText}>⏭️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() => {
                setPlaybackSpeed(Math.min(5.0, playbackSpeed + 0.5));
                if (!isPlaying) {
                  startPlayback();
                } // Start playback if not already playing
              }}>
              <Text style={styles.miniText}>⏩</Text>
            </TouchableOpacity>
          </View>

          {/* Speed & Position Display */}
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
                (getCurrentPosition() / (processedData?.totalPoints || 1)) *
                  100,
              )}
              %
            </Text>
          </View>

          {/* Zoom Controls */}
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

      <View style={styles.chartContainer}>
        <View style={styles.simpleChart}>
          {/* Y-axis */}
          <View style={styles.yAxis}>
            {[100, 80, 60, 40, 20, 0].map(value => (
              <Text key={value} style={styles.yAxisLabel}>
                {value}%
              </Text>
            ))}
            {/* Y-axis line */}
            <View style={styles.yAxisLine} />
          </View>

          {/* Chart area */}
          <View style={styles.chartArea}>
            {/* Grid lines */}
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

            {/* Data lines - Optimized SVG-based rendering */}
            <View style={styles.lineChart}>
              {(() => {
                if (!processedData || visibleData.data.length < 2) {
                  return null;
                }

                const selectedData = getSelectedSeriesData();
                const visibleCount = visibleData.data.length;
                const actualStartIdx = visibleData.startIdx;

                // Render all visible data points without sampling

                return selectedData.map(series => {
                  if (!series) {
                    return null;
                  }

                  // Generate SVG path for this series using all visible data points
                  let pathData = '';
                  for (let i = 0; i < visibleCount; i++) {
                    const x = (i / (visibleCount - 1)) * chartWidth;
                    const dataIndex = actualStartIdx + i;
                    const normalizedValue =
                      series.normalizedData[dataIndex] || 0;
                    const y = chartHeight - normalizedValue * chartHeight;

                    if (i === 0) {
                      pathData += `M ${x} ${y}`;
                    } else {
                      pathData += ` L ${x} ${y}`;
                    }
                  }

                  return (
                    <View
                      key={`series-${series.key}`}
                      style={styles.svgContainer}>
                      <svg
                        width={chartWidth}
                        height={chartHeight}
                        style={styles.svgChart}>
                        <path
                          d={pathData}
                          stroke={series.color}
                          strokeWidth={2}
                          fill='none'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </View>
                  );
                });
              })()}
            </View>

            {/* X-axis */}
            <View style={styles.xAxis}>
              {(() => {
                // Generate labels: left is "Now" (current), right is future data
                const labels = [];
                const numLabels = 5;

                for (let i = 0; i <= numLabels; i++) {
                  const x = (i / numLabels) * chartWidth;
                  const dataIndex = Math.floor(
                    ((displayData.length - 1) * i) / numLabels,
                  );
                  const dataPoint = displayData[dataIndex];

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
          Position: {currentLapPct.toFixed(1)}% lap
        </Text>
        <View style={styles.currentValues}>
          {selectedSeries.map((seriesKey, index) => {
            const seriesData = selectedSeriesData[index];
            const currentValue = processedData?.raw[
              Math.floor(getCurrentPosition())
            ]?.[seriesKey as keyof TimeSeriesData] as number;
            const color = seriesData?.color || '#FFFFFF';

            return (
              <Text key={seriesKey} style={[styles.seriesValueText, {color}]}>
                {seriesKey.charAt(0).toUpperCase() +
                  seriesKey.slice(1).replace(/([A-Z])/g, ' $1')}
                :{' '}
                {seriesKey === 'rpm' || seriesKey === 'speed'
                  ? currentValue
                    ? seriesKey === 'speed'
                      ? Math.round(currentValue * 2.23694) // Convert m/s to mph
                      : Math.round(currentValue)
                    : 0
                  : currentValue
                  ? currentValue.toFixed(2)
                  : '0.00'}
                {seriesKey === 'rpm'
                  ? ' RPM'
                  : seriesKey === 'speed'
                  ? ' mph'
                  : seriesKey === 'gear'
                  ? ''
                  : '%'}
              </Text>
            );
          })}
        </View>
        <Text style={styles.statsText}>
          Series: {selectedSeries.length} | Points:{' '}
          {processedData?.totalPoints || 0}
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
  seriesButton: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  seriesButtonActive: {
    backgroundColor: '#2196F3',
  },
  seriesButtonText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '500',
  },
  seriesButtonTextActive: {
    color: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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
  scaleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  scaleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 4,
    minWidth: 30,
    textAlign: 'center',
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
  currentValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  seriesValueText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 12,
    marginBottom: 2,
  },
});
