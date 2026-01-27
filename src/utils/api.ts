import axios, {AxiosInstance, AxiosResponse, AxiosError} from 'axios';
import {Garage61User, LapsResponse, ApiError} from '@/types';

// Environment variables
// In development, use webpack proxy to avoid CORS issues
// In production, use the direct API URL
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment
  ? '/api/garage61' // Proxied through webpack dev server
  : process.env.GARAGE61_API_BASE_URL || 'https://garage61.net/api/v1';
const API_TOKEN = process.env.GARAGE61_API_TOKEN;

if (!API_TOKEN) {
  console.warn('GARAGE61_API_TOKEN environment variable is not set');
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
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

  // Get current user information
  async getCurrentUser(): Promise<Garage61User> {
    try {
      const response: AxiosResponse<Garage61User> = await this.client.get(
        '/me',
      );
      return response.data;
    } catch (error) {
      throw error;
    }
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
    try {
      const url = '/laps';
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log('API Client: Making request to:', fullUrl);

      // Convert array parameters to comma-separated strings for GET requests
      const processedParams = {
        ...params,
        cars: params?.cars?.join(','),
        tracks: params?.tracks?.join(','),
        sessionTypes: params?.sessionTypes?.join(','),
        event: params?.event,
      };

      const response: AxiosResponse<LapsResponse> = await this.client.get(url, {
        params: {
          limit: 100, // Default limit
          ...processedParams,
        },
      });
      return response.data;
    } catch (error) {
      console.error('API Client: Request failed:', error);
      throw error;
    }
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
    try {
      const response: AxiosResponse<string> = await this.client.get(endpoint, {
        responseType: 'text',
        headers: {
          Accept: 'text/csv',
        },
      });
      return response.data;
    } catch (error) {
      console.error('API Client: CSV request failed:', error);
      throw error;
    }
  }

  // Check if API is accessible
  async ping(): Promise<boolean> {
    try {
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
