import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Garage61User, ApiError } from '@/types';

// Environment variables
// In development, use webpack proxy to avoid CORS issues
// In production, use the direct API URL
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment
  ? '/api/garage61' // Proxied through webpack dev server
  : (process.env.GARAGE61_API_BASE_URL || 'https://garage61.net/api/v1');
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
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          code: error.code,
          details: error.response?.data,
        };

        console.error('API Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  // Get current user information
  async getCurrentUser(): Promise<Garage61User> {
    try {
      const response: AxiosResponse<Garage61User> = await this.client.get('/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Generic GET method for future endpoints
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
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