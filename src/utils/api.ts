import axios, {AxiosInstance, AxiosResponse, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Garage61User, LapsResponse, ApiError} from '@/types';
import {API_CONFIG} from '@/config/api';

// Environment variables
// In development, use webpack proxy to avoid CORS issues
// In production, use Firebase Functions proxy to avoid CORS issues
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment
  ? '/api/garage61' // Proxied through webpack dev server
  : '/api/garage61'; // Proxied through Firebase Functions

// Global request cache to survive HMR and ensure proper deduplication
// Using window object to persist across webpack HMR reloads, which reset module-level variables
const globalRequestCache =
  (window as any).__apiRequestCache ||
  ((window as any).__apiRequestCache = new Map<string, Promise<any>>());

class ApiClient {
  private client: AxiosInstance;

  constructor() {
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
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          code: error.code,
          details: error.response?.data,
        };

        console.error('API Error:', apiError);
        return Promise.reject(apiError);
      },
    );
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      // First try to get from AsyncStorage
      const storedToken = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEY);
      if (storedToken) {
        return storedToken;
      }

      // Fallback to environment variable for development
      const envToken = process.env.GARAGE61_API_TOKEN;
      if (envToken) {
        return envToken;
      }

      return null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      // Fallback to environment variable
      return process.env.GARAGE61_API_TOKEN || null;
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

  // Get CSV data (for telemetry)
  async getCsv(endpoint: string): Promise<string> {
    return this.deduplicatedRequest<string>('GET', endpoint, {
      responseType: 'text',
      headers: {
        Accept: 'text/csv',
      },
    });
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
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
