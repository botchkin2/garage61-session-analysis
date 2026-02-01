import axios, {AxiosInstance, AxiosResponse, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {Platform} from 'react-native';
import {Garage61User, LapsResponse, ApiError} from '@src/types';
import {API_CONFIG} from '@src/config/api';

// Configure API endpoints
const FIREBASE_PROXY_URL = '/api/garage61'; // For web
const FIREBASE_HOSTING_URL = 'https://botracing-61.web.app/api/garage61'; // For mobile
const DIRECT_API_URL = 'https://garage61.net/api/v1'; // Fallback

// Use platform-specific URLs
const API_BASE_URL = Platform.select({
  web: FIREBASE_PROXY_URL,
  default: FIREBASE_HOSTING_URL, // Use full Firebase hosting URL on mobile
});

// Global request cache to ensure proper deduplication
// For React Native, we use a module-level variable since HMR works differently
const globalRequestCache = new Map<string, Promise<any>>();

// File system cache configuration
const CSV_CACHE_DIR = `${FileSystem.documentDirectory}csv-cache/`;
const CACHE_METADATA_KEY = 'csv_cache_metadata';

// Cache size limits (in bytes)
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB total cache size
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const CACHE_CLEANUP_THRESHOLD = 0.8; // Clean up when cache reaches 80% of max size

// Cache metadata structure
interface CacheMetadata {
  [lapId: string]: {
    filePath: string;
    size: number;
    lastAccessed: number;
    created: number;
    checksum?: string;
  };
}

// Ensure cache directory exists
const ensureCacheDirectory = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(CSV_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CSV_CACHE_DIR, {intermediates: true});
  }
};

// Get cache metadata from AsyncStorage
const getCacheMetadata = async (): Promise<CacheMetadata> => {
  try {
    const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : {};
  } catch (error) {
    console.error('Error reading cache metadata:', error);
    return {};
  }
};

// Save cache metadata to AsyncStorage
const saveCacheMetadata = async (metadata: CacheMetadata): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error saving cache metadata:', error);
  }
};

// Generate cache file path for a lap ID
const getCacheFilePath = (lapId: string): string => {
  return `${CSV_CACHE_DIR}${lapId}.csv`;
};

// Calculate simple checksum for data validation
const calculateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Simple compression for CSV data using delta encoding and sampling
const compressCsvData = (
  csvData: string,
): {compressed: string; metadata: any} => {
  const lines = csvData.split('\n');
  if (lines.length < 2) {
    return {compressed: csvData, metadata: {compressed: false}};
  }

  // Parse header to identify numeric columns
  const header = lines[0];
  const headers = header.split(',').map(h => h.trim());

  // Identify which columns are numeric (for delta encoding)
  const numericColumns = [
    'LapDistPct',
    'Lat',
    'Lon',
    'Brake',
    'Throttle',
    'RPM',
    'SteeringWheelAngle',
    'Speed',
    'Gear',
  ];
  const numericIndices: number[] = [];

  numericColumns.forEach(col => {
    const index = headers.indexOf(col);
    if (index !== -1) {
      numericIndices.push(index);
    }
  });

  // Apply delta encoding to numeric columns
  const compressedLines = [header]; // Keep header as-is
  let previousValues: (number | null)[] = new Array(headers.length).fill(null);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const compressedValues: string[] = [];

    for (let j = 0; j < values.length; j++) {
      const value = values[j];
      const numValue = parseFloat(value);

      if (
        numericIndices.includes(j) &&
        !isNaN(numValue) &&
        previousValues[j] !== null
      ) {
        // Apply delta encoding for numeric values
        const delta = numValue - (previousValues[j] as number);
        compressedValues.push(delta.toString());
        previousValues[j] = numValue;
      } else {
        // Store absolute value for first occurrence or non-numeric
        compressedValues.push(value);
        if (numericIndices.includes(j) && !isNaN(numValue)) {
          previousValues[j] = numValue;
        }
      }
    }

    compressedLines.push(compressedValues.join(','));
  }

  const compressed = compressedLines.join('\n');

  return {
    compressed,
    metadata: {
      compressed: true,
      originalSize: csvData.length,
      compressedSize: compressed.length,
      compressionRatio: compressed.length / csvData.length,
      numericColumns: numericIndices,
    },
  };
};

// Decompress CSV data
const decompressCsvData = (compressedData: string, metadata: any): string => {
  if (!metadata.compressed) {
    return compressedData;
  }

  const lines = compressedData.split('\n');
  if (lines.length < 2) {
    return compressedData;
  }

  const header = lines[0];
  const headers = header.split(',').map(h => h.trim());
  const numericIndices = metadata.numericColumns || [];

  const decompressedLines = [header];
  let previousValues: (number | null)[] = new Array(headers.length).fill(null);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const decompressedValues: string[] = [];

    for (let j = 0; j < values.length; j++) {
      const value = values[j];

      if (numericIndices.includes(j)) {
        const numValue = parseFloat(value);

        if (!isNaN(numValue) && previousValues[j] !== null) {
          // Apply reverse delta encoding
          const originalValue = (previousValues[j] as number) + numValue;
          decompressedValues.push(originalValue.toString());
          previousValues[j] = originalValue;
        } else {
          // First occurrence, store as absolute
          decompressedValues.push(value);
          if (!isNaN(numValue)) {
            previousValues[j] = numValue;
          }
        }
      } else {
        // Non-numeric column, store as-is
        decompressedValues.push(value);
      }
    }

    decompressedLines.push(decompressedValues.join(','));
  }

  return decompressedLines.join('\n');
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    console.log(
      `🚗 API Client initialized for ${Platform.OS} with base URL: ${API_BASE_URL}`,
    );

    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.TIMEOUT,
    });

    // Add request interceptor to dynamically set auth header
    this.client.interceptors.request.use(async config => {
      const token = await this.getStoredToken();
      const fullUrl = config.baseURL + config.url;
      console.log(
        `🌐 ${
          Platform.OS
        } API Request: ${config.method?.toUpperCase()} ${fullUrl}`,
      );

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Authorization header set');
      } else {
        console.log('❌ No token available for request');
      }
      return config;
    });

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      response => {
        const fullUrl = response.config.baseURL + response.config.url;
        console.log(
          `✅ ${
            Platform.OS
          } API Response: ${response.config.method?.toUpperCase()} ${fullUrl} - Status: ${
            response.status
          }`,
        );

        // Log response data summary for debugging
        if (response.data) {
          const dataType = Array.isArray(response.data)
            ? 'array'
            : typeof response.data;
          const dataSize = JSON.stringify(response.data).length;
          console.log(
            `📦 Response data: ${dataType}, ~${Math.round(dataSize / 1024)}KB`,
          );

          if (response.data.items && Array.isArray(response.data.items)) {
            console.log(
              `📊 Found ${response.data.items.length} items in response`,
            );
          }
        }

        return response;
      },
      (error: AxiosError) => {
        const fullUrl = error.config?.baseURL + error.config?.url;
        console.error(`❌ ${Platform.OS} API Error for ${fullUrl}:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          details: error.response?.data,
        });

        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          code: error.code,
          details: error.response?.data,
        };

        return Promise.reject(apiError);
      },
    );
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      // First try environment variable (built into app)
      const envToken = process.env.EXPO_PUBLIC_GARAGE61_API_TOKEN;
      if (envToken && envToken !== 'REPLACE_WITH_YOUR_ACTUAL_API_TOKEN') {
        console.log('Using built-in API token from environment');
        return envToken;
      }

      // Fallback to AsyncStorage (for manual override)
      const storedToken = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEY);
      if (storedToken) {
        console.log('Using token from AsyncStorage');
        return storedToken;
      }

      console.log(
        'No API token configured - please set EXPO_PUBLIC_GARAGE61_API_TOKEN in .env',
      );
      return null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      // Fallback to environment variable
      const envToken = process.env.EXPO_PUBLIC_GARAGE61_API_TOKEN;
      if (envToken && envToken !== 'REPLACE_WITH_YOUR_ACTUAL_API_TOKEN') {
        console.log('Using fallback environment token');
        return envToken;
      }
      return null;
    }
  }

  // Deduplicate requests to prevent redundant API calls
  private async deduplicatedRequest<T>(
    method: string,
    url: string,
    config?: any,
  ): Promise<T> {
    const cacheKey = `${method}:${url}:${JSON.stringify(config || {})}`;

    // Check if we already have a pending request for this exact call
    if (globalRequestCache.has(cacheKey)) {
      return globalRequestCache.get(cacheKey)!;
    }

    // Create the request
    const requestPromise = this.client
      .request<AxiosResponse<T>>({
        method: method as any,
        url,
        ...config,
      })
      .then(result => {
        // Remove from cache after completion
        globalRequestCache.delete(cacheKey);
        return result.data;
      })
      .catch(error => {
        // Remove from cache on error
        globalRequestCache.delete(cacheKey);
        throw error;
      });

    // Cache the promise immediately
    globalRequestCache.set(cacheKey, requestPromise);

    return requestPromise;
  }

  // Get current user information
  async getCurrentUser(): Promise<Garage61User> {
    return this.deduplicatedRequest<Garage61User>('GET', '/me');
  }

  // Get laps with filtering
  async getLaps(params?: {
    limit?: number;
    offset?: number;
    age?: number; // days
    drivers?: string; // Must be comma-separated string for API
    cars?: number[];
    tracks?: number[];
    sessionTypes?: number[];
    event?: string; // Event ID to filter by
    unclean?: boolean; // Include unclean laps
    minLapTime?: number;
    maxLapTime?: number;
    group?: 'driver' | 'driver-car' | 'none'; // API grouping option
  }): Promise<LapsResponse> {
    // Convert array parameters to comma-separated strings for GET requests
    const processedParams = {
      ...params,
      cars: params?.cars?.join(','),
      tracks: params?.tracks?.join(','),
      sessionTypes: params?.sessionTypes?.join(','),
      event: params?.event,
    };

    const queryParams = {
      limit: 100, // Default limit
      ...processedParams,
    };

    return this.deduplicatedRequest<LapsResponse>('GET', '/laps', {
      params: queryParams,
    });
  }

  // Generic GET method for future endpoints
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get CSV data (for telemetry) with device caching and memory optimization
  async getCsv(
    endpoint: string,
    options?: {
      useCache?: boolean;
      skipCache?: boolean;
      maxRetries?: number;
      timeout?: number;
    },
  ): Promise<string> {
    const {
      useCache = true,
      skipCache = false,
      maxRetries = 2,
      timeout = 60000, // 60 seconds for large files
    } = options || {};

    // Extract lap ID from endpoint (assuming format: /laps/{lapId}/csv)
    const lapIdMatch = endpoint.match(/\/laps\/([^\/]+)\/csv/);
    const lapId = lapIdMatch ? lapIdMatch[1] : null;

    // Try to load from cache first (if enabled and we have a lap ID)
    if (useCache && lapId && !skipCache) {
      try {
        const cachedData = await this.getCachedCsv(lapId);
        if (cachedData) {
          console.log(`Loaded CSV for lap ${lapId} from device cache`);
          return cachedData;
        }
      } catch (error) {
        console.warn('Failed to load from cache:', error);
        // Continue to fetch from API
      }
    }

    let lastError: any;

    // Retry logic with exponential backoff for large files
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Fetching CSV for ${endpoint} (attempt ${attempt + 1}/${
            maxRetries + 1
          })`,
        );

        // Fetch from API with extended timeout for large files
        const csvData = await this.deduplicatedRequest<string>(
          'GET',
          endpoint,
          {
            responseType: 'text',
            headers: {
              Accept: 'text/csv',
              // Request compression to reduce bandwidth
              'Accept-Encoding': 'gzip, deflate',
            },
            timeout,
            // Add progress tracking for large downloads
            onDownloadProgress: progressEvent => {
              if (progressEvent.total && progressEvent.total > 1024 * 1024) {
                // > 1MB
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                );
                console.log(`CSV download progress: ${percentCompleted}%`);
              }
            },
          },
        );

        // Validate CSV data (basic check)
        if (!csvData || csvData.length === 0) {
          throw new Error('Received empty CSV data');
        }

        // Check for common error responses in CSV format
        if (
          csvData.includes('out of shared memory') ||
          csvData.includes('memory')
        ) {
          throw new Error('Server memory error - file may be too large');
        }

        // Cache the data if we have a lap ID and caching is enabled
        if (useCache && lapId && csvData) {
          try {
            await this.cacheCsvData(lapId, csvData);
            console.log(
              `Cached CSV for lap ${lapId} to device (${(
                csvData.length /
                1024 /
                1024
              ).toFixed(2)} MB)`,
            );
          } catch (error) {
            console.warn('Failed to cache CSV data:', error);
            // Don't fail the request if caching fails
          }
        }

        return csvData;
      } catch (error: any) {
        lastError = error;
        console.error(
          `CSV download attempt ${attempt + 1} failed:`,
          error.message,
        );

        // Check if it's a memory-related error
        if (
          error.message?.includes('out of shared memory') ||
          error.message?.includes('memory') ||
          error.response?.status === 500
        ) {
          // For memory errors, don't retry as it will likely fail again
          throw new Error(
            `Server memory error downloading CSV data: ${error.message}`,
          );
        }

        // For other errors, wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw (
      lastError || new Error('Failed to download CSV data after all retries')
    );
  }

  // Get cached CSV data from device storage with decompression
  private async getCachedCsv(lapId: string): Promise<string | null> {
    try {
      await ensureCacheDirectory();
      const metadata = await getCacheMetadata();
      const cacheEntry = metadata[lapId];

      if (!cacheEntry) {
        return null;
      }

      const filePath = getCacheFilePath(lapId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        // Clean up metadata if file doesn't exist
        delete metadata[lapId];
        await saveCacheMetadata(metadata);
        return null;
      }

      // Read compressed file content
      const cacheDataStr = await FileSystem.readAsStringAsync(filePath);
      const cacheData = JSON.parse(cacheDataStr);

      // Handle different cache versions
      let csvData: string;
      if (cacheData.version === '1.0' && cacheData.compression?.compressed) {
        // Decompress data
        csvData = decompressCsvData(cacheData.data, cacheData.compression);
      } else {
        // Legacy uncompressed format
        csvData = cacheData.data || cacheData;
      }

      // Validate data if we have a checksum
      const checksum = cacheEntry.compressed
        ? calculateChecksum(cacheData.data)
        : calculateChecksum(csvData);

      if (cacheEntry.checksum && checksum !== cacheEntry.checksum) {
        console.warn(`Checksum mismatch for cached CSV ${lapId}, discarding`);
        await this.deleteCachedCsv(lapId);
        return null;
      }

      // Update last accessed time
      cacheEntry.lastAccessed = Date.now();
      await saveCacheMetadata(metadata);

      return csvData;
    } catch (error) {
      console.error('Error reading cached CSV:', error);
      return null;
    }
  }

  // Cache CSV data to device storage with compression and size management
  private async cacheCsvData(lapId: string, csvData: string): Promise<void> {
    try {
      // Compress the data
      const {compressed, metadata: compressionMetadata} =
        compressCsvData(csvData);

      // Check compressed file size limit
      if (compressed.length > MAX_FILE_SIZE) {
        console.warn(
          `Compressed CSV file for lap ${lapId} is too large (${(
            compressed.length /
            1024 /
            1024
          ).toFixed(2)}MB), skipping cache`,
        );
        return;
      }

      await ensureCacheDirectory();

      // Check if we need to clean up cache before adding new file
      await this.ensureCacheSize(compressed.length);

      const filePath = getCacheFilePath(lapId);
      const checksum = calculateChecksum(compressed);

      // Store both compressed data and compression metadata
      const cacheData = JSON.stringify({
        data: compressed,
        compression: compressionMetadata,
        version: '1.0',
      });

      // Write compressed file
      await FileSystem.writeAsStringAsync(filePath, cacheData);

      // Update metadata
      const metadata = await getCacheMetadata();
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      metadata[lapId] = {
        filePath,
        size: fileInfo.size || cacheData.length,
        originalSize: csvData.length,
        compressedSize: compressed.length,
        compressionRatio: compressionMetadata.compressionRatio || 1,
        lastAccessed: Date.now(),
        created: Date.now(),
        checksum,
        compressed: true,
      };

      await saveCacheMetadata(metadata);

      const savings = (
        ((csvData.length - compressed.length) / csvData.length) *
        100
      ).toFixed(1);
      console.log(
        `Compressed CSV cache: ${savings}% space saved (${(
          compressed.length / 1024
        ).toFixed(1)}KB)`,
      );
    } catch (error) {
      console.error('Error caching CSV data:', error);
      throw error;
    }
  }

  // Delete cached CSV data
  private async deleteCachedCsv(lapId: string): Promise<void> {
    try {
      const filePath = getCacheFilePath(lapId);
      await FileSystem.deleteAsync(filePath, {idempotent: true});

      const metadata = await getCacheMetadata();
      delete metadata[lapId];
      await saveCacheMetadata(metadata);
    } catch (error) {
      console.error('Error deleting cached CSV:', error);
    }
  }

  // Clear all cached CSV data
  async clearCsvCache(): Promise<void> {
    try {
      await ensureCacheDirectory();

      const metadata = await getCacheMetadata();
      const lapIds = Object.keys(metadata);

      // Delete all cache files
      await Promise.all(
        lapIds.map(async lapId => {
          const filePath = getCacheFilePath(lapId);
          await FileSystem.deleteAsync(filePath, {idempotent: true});
        }),
      );

      // Clear metadata
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      console.log(`Cleared ${lapIds.length} cached CSV files`);
    } catch (error) {
      console.error('Error clearing CSV cache:', error);
    }
  }

  // Ensure cache size is within limits by cleaning up old files
  private async ensureCacheSize(newFileSize: number): Promise<void> {
    const stats = await this.getCacheStats();

    // Check if adding this file would exceed cache limits
    if (stats.totalSize + newFileSize > MAX_CACHE_SIZE) {
      console.log('Cache size limit reached, cleaning up old files...');
      await this.cleanupCache(MAX_CACHE_SIZE - newFileSize);
    } else if (stats.totalSize > MAX_CACHE_SIZE * CACHE_CLEANUP_THRESHOLD) {
      console.log(
        'Cache size approaching limit, performing maintenance cleanup...',
      );
      await this.cleanupCache(MAX_CACHE_SIZE * 0.7); // Keep 70% of max size
    }
  }

  // Clean up cache to reach target size
  private async cleanupCache(targetSize: number): Promise<void> {
    try {
      const metadata = await getCacheMetadata();
      const files = Object.entries(metadata)
        .map(([lapId, entry]) => ({
          lapId,
          ...entry,
        }))
        .sort((a, b) => a.lastAccessed - b.lastAccessed); // Oldest first

      let currentSize = files.reduce((sum, file) => sum + file.size, 0);
      let filesToDelete: string[] = [];

      // Delete oldest files until we're under the target size
      for (const file of files) {
        if (currentSize <= targetSize) {
          break;
        }

        filesToDelete.push(file.lapId);
        currentSize -= file.size;
      }

      // Delete the files
      await Promise.all(
        filesToDelete.map(async lapId => {
          await this.deleteCachedCsv(lapId);
        }),
      );

      console.log(
        `Cleaned up ${filesToDelete.length} cached CSV files, freed ${
          (filesToDelete.length > 0
            ? files.reduce((sum, f) => sum + f.size, 0) - currentSize
            : 0) /
          1024 /
          1024
        }MB`,
      );
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    originalTotalSize: number;
    maxSize: number;
    usagePercent: number;
    compressionSavings: number;
    files: {
      lapId: string;
      size: number;
      originalSize?: number;
      compressionRatio?: number;
      lastAccessed: number;
      created: number;
      compressed: boolean;
    }[];
  }> {
    try {
      const metadata = await getCacheMetadata();
      const files = Object.entries(metadata).map(([lapId, entry]) => ({
        lapId,
        size: entry.size,
        originalSize: entry.originalSize,
        compressionRatio: entry.compressionRatio,
        lastAccessed: entry.lastAccessed,
        created: entry.created,
        compressed: entry.compressed || false,
      }));

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const originalTotalSize = files.reduce(
        (sum, file) => sum + (file.originalSize || file.size),
        0,
      );
      const compressionSavings =
        originalTotalSize > 0
          ? ((originalTotalSize - totalSize) / originalTotalSize) * 100
          : 0;
      const usagePercent =
        MAX_CACHE_SIZE > 0 ? (totalSize / MAX_CACHE_SIZE) * 100 : 0;

      return {
        totalFiles: files.length,
        totalSize,
        originalTotalSize,
        maxSize: MAX_CACHE_SIZE,
        usagePercent,
        compressionSavings,
        files,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        originalTotalSize: 0,
        maxSize: MAX_CACHE_SIZE,
        usagePercent: 0,
        compressionSavings: 0,
        files: [],
      };
    }
  }

  // Check if API token is configured
  async isTokenConfigured(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  // Check if API is accessible
  async ping(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        return false;
      }
      await this.client.get('/me');
      return true;
    } catch {
      return false;
    }
  }

  // Test API connectivity and suggest solutions
  async diagnoseConnection(): Promise<{
    firebaseProxy: boolean;
    directApi: boolean;
    recommendation: string;
  }> {
    const results = {
      firebaseProxy: false,
      directApi: false,
      recommendation: '',
    };

    const token = await this.getStoredToken();
    if (!token) {
      results.recommendation =
        'No API token configured. Set EXPO_PUBLIC_GARAGE61_API_TOKEN in .env file.';
      return results;
    }

    // Test Firebase proxy (platform-specific)
    try {
      const testUrl = Platform.select({
        web: FIREBASE_PROXY_URL,
        default: FIREBASE_HOSTING_URL,
      });
      console.log(
        `Testing Firebase proxy connection (${Platform.OS}): ${testUrl}/me`,
      );
      await axios.get(testUrl + '/me', {
        headers: {Authorization: `Bearer ${token}`},
        timeout: 5000,
      });
      results.firebaseProxy = true;
      console.log('✅ Firebase proxy works');
    } catch (error) {
      console.log('❌ Firebase proxy failed:', error.message);
    }

    // Test direct API
    try {
      console.log('Testing direct API connection...');
      await axios.get(DIRECT_API_URL + '/me', {
        headers: {Authorization: `Bearer ${token}`},
        timeout: 5000,
      });
      results.directApi = true;
      console.log('✅ Direct API works');
    } catch (error) {
      console.log('❌ Direct API failed:', error.message);
    }

    // Provide recommendation
    if (results.firebaseProxy) {
      results.recommendation =
        'Using Firebase proxy - should work on both web and mobile.';
    } else if (results.directApi) {
      results.recommendation =
        'Firebase proxy not accessible. Consider deploying Firebase functions or switching to direct API.';
    } else {
      results.recommendation =
        'Both Firebase proxy and direct API failed. Check your API token and network connection.';
    }

    return results;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
