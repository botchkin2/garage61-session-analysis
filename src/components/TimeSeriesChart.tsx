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
}

interface TimeSeriesChartProps {
  title?: string;
  dataPoints?: number;
  animationDuration?: number;
  onDataUpdate?: (data: TimeSeriesData[]) => void;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  title = 'Real-Time Brake Pressure',
  dataPoints = 20,
  onDataUpdate,
}) => {
  const [allData, setAllData] = useState<TimeSeriesData[]>([]);
  const [visibleData, setVisibleData] = useState<TimeSeriesData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0); // Continuous position (0 to allData.length)
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Speed multiplier (-5 to 5, negative = rewind)
  const [zoomLevel, setZoomLevel] = useState(3); // Zoom level 1-5 (higher = more zoomed in/less data)
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Load CSV data
  const loadCsvData = useCallback(async () => {
    try {
      const response = await axios.get('/sample_data/sample_lap.csv');
      const csvText = response.data as string;
      const lines = csvText
        .split('\n')
        .filter((line: string) => line.trim() !== '');
      const headers = lines[0].split(',');

      const lapDistPctIndex = headers.indexOf('LapDistPct');
      const brakeIndex = headers.indexOf('Brake');

      const parsedData: TimeSeriesData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > Math.max(lapDistPctIndex, brakeIndex)) {
          const lapDistPct = parseFloat(values[lapDistPctIndex]);
          const brake = parseFloat(values[brakeIndex]);

          if (!isNaN(lapDistPct) && !isNaN(brake)) {
            parsedData.push({
              timestamp: new Date(),
              value: brake,
              label: `${(lapDistPct * 100).toFixed(2)}%`,
              lapDistPct: lapDistPct * 100, // Store as percentage for easier calculations
            });
          }
        }
      }

      // Sort by LapDistPct to ensure proper ordering
      parsedData.sort((a, b) => a.lapDistPct - b.lapDistPct);

      console.log(`Loaded ${parsedData.length} data points from CSV`);
      console.log(
        `Brake range: ${Math.min(...parsedData.map(d => d.value)).toFixed(
          4,
        )} - ${Math.max(...parsedData.map(d => d.value)).toFixed(4)}`,
      );
      setAllData(parsedData);
      updateVisibleData(parsedData, 0);
      onDataUpdate?.(parsedData);
    } catch (error) {
      console.error('Failed to load CSV data, using generated data:', error);
      initializeData();
    }
  }, [updateVisibleData, onDataUpdate, initializeData]);

  // Update visible data based on current position and zoom level
  // Data slides continuously from right to left: "now" is always at left (x=0)
  const updateVisibleData = useCallback(
    (data: TimeSeriesData[], position: number) => {
      if (data.length === 0) {
        return;
      }

      // Calculate the range of data to show based on zoom level
      // Zoom 1-5 maps to 15%-2% of data visible (higher zoom = less data = more zoomed in)
      const totalPoints = data.length;
      const dataPercentage = 15 - (zoomLevel - 1) * 3.25; // 15% at zoom 1, 2% at zoom 5
      const pointsToShow = Math.max(
        50,
        Math.floor(totalPoints * (dataPercentage / 100)),
      );

      // Position determines where the rightmost data point is
      // Leftmost (x=0) is always "now", rightmost shows historical data
      const endIdx = Math.min(totalPoints - 1, Math.floor(position));
      const startIdx = Math.max(0, endIdx - pointsToShow + 1);

      const visiblePoints = data.slice(startIdx, endIdx + 1);
      setVisibleData(visiblePoints);
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
      });
    }
    setAllData(initialData);
    updateVisibleData(initialData, 0);
    onDataUpdate?.(initialData);
  }, [dataPoints, updateVisibleData, onDataUpdate]);

  // Start real-time playback
  const startPlayback = () => {
    if (isPlaying || allData.length === 0) {
      return;
    }

    setIsPlaying(true);

    const animate = () => {
      setCurrentPosition(prevPos => {
        let nextPos = prevPos + 0.5; // Smooth continuous movement
        if (nextPos >= allData.length) {
          nextPos = 0; // Loop back to start
        }

        updateVisibleData(allData, nextPos);
        return nextPos;
      });
    };

    // Calculate delay based on speed (faster speed = shorter delay)
    const baseDelay = 30; // Base delay in milliseconds for smooth animation
    const speedDelay = Math.max(5, baseDelay / playbackSpeed);

    animationRef.current = setInterval(animate, speedDelay);
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
    setCurrentPosition(0);
    updateVisibleData(allData, 0);
  };

  useEffect(() => {
    loadCsvData();
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [loadCsvData]);

  // Update visible data when zoom level changes
  useEffect(() => {
    if (allData.length > 0) {
      updateVisibleData(allData, currentPosition);
    }
  }, [zoomLevel, allData, currentPosition, updateVisibleData]);

  // Restart animation when speed changes during playback
  useEffect(() => {
    if (isPlaying && allData.length > 0) {
      // Stop current animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Restart with new speed
      const animate = () => {
        setCurrentPosition(prevPos => {
          let nextPos = prevPos + 0.5 * playbackSpeed; // Move based on speed (includes direction and magnitude)
          if (nextPos >= allData.length) {
            nextPos = 0; // Loop back to start
          } else if (nextPos < 0) {
            nextPos = allData.length - 1; // Loop back to end
          }
          updateVisibleData(allData, nextPos);
          return nextPos;
        });
      };

      const baseDelay = 50; // Base delay in milliseconds for smooth animation
      const speedDelay = Math.max(10, baseDelay / Math.abs(playbackSpeed)); // Use absolute value for delay

      animationRef.current = setInterval(animate, speedDelay);
    }
  }, [playbackSpeed, isPlaying, allData, updateVisibleData]);

  // Update visible data when zoom changes during playback
  useEffect(() => {
    if (isPlaying && allData.length > 0) {
      // Stop current animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Restart with new speed
      const animate = () => {
        setCurrentPosition(prevPos => {
          let nextPos = prevPos + 0.5 * playbackSpeed; // Move based on speed (includes direction and magnitude)
          if (nextPos >= allData.length) {
            nextPos = 0; // Loop back to start
          } else if (nextPos < 0) {
            nextPos = allData.length - 1; // Loop back to end
          }
          updateVisibleData(allData, nextPos);
          return nextPos;
        });
      };

      const baseDelay = 50; // Base delay in milliseconds for smooth animation
      const speedDelay = Math.max(10, baseDelay / Math.abs(playbackSpeed)); // Use absolute value for delay

      animationRef.current = setInterval(animate, speedDelay);
    }
  }, [playbackSpeed, zoomLevel, isPlaying, allData, updateVisibleData]);

  // Note: Zoom changes during playback are handled automatically by the animation
  // since updateVisibleData uses the current zoomLevel from state

  // Prepare data for display - brake values are 0-1, convert to 0-100% for display
  const displayData = visibleData.map(item => ({
    ...item,
    displayValue: item.value * 100, // Convert to percentage for display
  }));

  // Calculate chart dimensions
  const chartWidth = width - 120;
  const chartHeight = 250;

  // Get current "now" position data (x=0 position = "now")
  const currentData = visibleData.length > 0 ? visibleData[0] : null; // First point is at x=0 ("now")
  const currentLapPct = currentData ? currentData.lapDistPct : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Compact Controls */}
      <View style={styles.compactControls}>
        {/* Main Transport Bar */}
        <View style={styles.transportBar}>
          {/* Reset Button */}
          <TouchableOpacity style={styles.miniButton} onPress={resetPlayback}>
            <Text style={styles.miniText}>🔄</Text>
          </TouchableOpacity>

          {/* Playback Controls */}
          <View style={styles.playbackGroup}>
            <TouchableOpacity
              style={styles.miniButton}
              onPress={() =>
                setPlaybackSpeed(Math.max(-5.0, playbackSpeed - 0.5))
              }>
              <Text style={styles.miniText}>⏪</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() =>
                setCurrentPosition(prev => Math.max(0, prev - 10))
              }>
              <Text style={styles.miniText}>⏮️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playButtonMini,
                isPlaying && styles.playButtonActive,
              ]}
              onPress={isPlaying ? stopPlayback : startPlayback}>
              <Text style={styles.playText}>{isPlaying ? '⏸️' : '▶️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() =>
                setCurrentPosition(prev =>
                  Math.min(allData.length - 1, prev + 10),
                )
              }>
              <Text style={styles.miniText}>⏭️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniButton}
              onPress={() =>
                setPlaybackSpeed(Math.min(5.0, playbackSpeed + 0.5))
              }>
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
              {Math.round((currentPosition / allData.length) * 100)}%
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
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            {[100, 80, 60, 40, 20, 0].map(value => (
              <Text key={value} style={styles.yAxisLabel}>
                {value}%
              </Text>
            ))}
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

            {/* Data lines */}
            <View style={styles.lineChart}>
              {/* Draw connecting lines between all visible points */}
              {displayData.length > 1 &&
                displayData.map((item, index) => {
                  if (index === 0) {
                    return null;
                  }
                  const prevItem = displayData[index - 1];

                  // Data slides right-to-left: leftmost (x=0) is "now", rightmost is historical data
                  // displayData[0] at left (x=0), displayData[last] at right (x=chartWidth)
                  const totalPoints = displayData.length;
                  const x1 = ((index - 1) / (totalPoints - 1)) * chartWidth;
                  const x2 = (index / (totalPoints - 1)) * chartWidth;

                  // Y position based on value (0-1 mapped to chart height, inverted)
                  const y1 = chartHeight - prevItem.value * chartHeight;
                  const y2 = chartHeight - item.value * chartHeight;

                  const length = Math.sqrt(
                    Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2),
                  );
                  if (length < 1) {
                    return null;
                  } // Skip very short lines

                  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                  const centerX = x1 + (x2 - x1) / 2;
                  const centerY = y1 + (y2 - y1) / 2;

                  return (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.lineSegment,
                        {
                          left: centerX - length / 2,
                          top: Math.max(
                            0,
                            Math.min(chartHeight - 2, centerY - 1),
                          ),
                          width: length,
                          transform: [{rotate: `${angle}deg`}],
                          backgroundColor: isPlaying ? '#2196f3' : '#666',
                        },
                      ]}
                    />
                  );
                })}

              {/* "Now" indicator at x=0 (leftmost position) */}
              <View style={[styles.nowIndicator, {height: chartHeight}]} />
            </View>

            {/* X-axis */}
            <View style={styles.xAxis}>
              {(() => {
                // Generate labels: left is "Now" (most recent), right is oldest data
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
          Now: {currentLapPct.toFixed(1)}% lap
        </Text>
        <Text style={styles.statsText}>
          Brake: {currentData ? (currentData.value * 100).toFixed(1) : '0.0'}%
        </Text>
        <Text style={styles.statsText}>
          Showing: {visibleData.length} points
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
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#2196f3',
    opacity: 0.8,
  },
  nowIndicator: {
    position: 'absolute',
    left: 0,
    width: 3,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  yAxis: {
    width: 50,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 10,
    height: 250,
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
});
