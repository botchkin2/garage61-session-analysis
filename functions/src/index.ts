import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import axios, {AxiosRequestConfig} from 'axios';

// Type definitions for Express-style request/response
interface Request {
  method: string;
  path: string;
  query: any;
  body: any;
  headers: any;
}

interface Response {
  set(header: string, value: string): void;
  status(code: number): Response;
  json(data: any): void;
  send(data: any): void;
  end(): void;
}

// Define the API token as a Firebase secret parameter
const garage61ApiToken = defineSecret('GARAGE61_API_TOKEN');

export const garage61Proxy = onRequest(
  {secrets: [garage61ApiToken]},
  async (req: Request, res: Response) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      // Get API token from Firebase secret parameter
      const apiToken = garage61ApiToken.value();

      if (!apiToken) {
        console.error(
          'GARAGE61_API_TOKEN not configured in Firebase Functions',
        );
        res.status(500).json({
          error: 'API token not configured',
          message:
            'Please configure the Garage 61 API token as a secret parameter',
        });
        return;
      }

      // Construct the target URL by stripping the /api/garage61 prefix from req.path
      const apiPath = req.path.replace(/^\/api\/garage61/, '');
      const targetUrl = `https://garage61.net/api/v1${apiPath}`;

      // Prepare axios config
      const axiosConfig: AxiosRequestConfig = {
        method: req.method as any,
        url: targetUrl,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          // Forward other headers but exclude host and some Firebase-specific ones
          ...Object.fromEntries(
            Object.entries(req.headers).filter(
              ([key]) =>
                ![
                  'host',
                  'connection',
                  'keep-alive',
                  'proxy-authenticate',
                  'proxy-authorization',
                  'te',
                  'trailers',
                  'transfer-encoding',
                  'upgrade',
                ].includes(key.toLowerCase()),
            ),
          ),
        },
        params: req.query,
        timeout: 30000, // 30 second timeout
      };

      // Add body for non-GET requests
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        axiosConfig.data = req.body;
      }

      console.log(`Proxying ${req.method} ${req.path} -> ${targetUrl}`);

      const response = await axios(axiosConfig);

      // Forward the response - handle CSV responses with streaming to reduce memory usage
      const contentType = response.headers['content-type'] || '';
      if (
        contentType.includes('text/csv') ||
        contentType.includes('application/csv')
      ) {
        // For large CSV responses, stream the data to avoid memory issues
        res.set('Content-Type', contentType);

        // Set additional headers for streaming
        res.set('Cache-Control', 'no-cache');
        res.set('Transfer-Encoding', 'chunked');

        // Forward the response data in chunks to reduce memory usage
        const data = response.data;
        if (typeof data === 'string') {
          // If it's already a string, send it directly
          res.status(response.status).send(data);
        } else {
          // If it's a stream or buffer, handle accordingly
          res.status(response.status).send(data);
        }
      } else {
        // For JSON and other responses, return as JSON
        res.status(response.status).json(response.data);
      }
    } catch (error: any) {
      console.error('Proxy error:', error);

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'No response received from Garage 61 API',
          details: error.message,
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
        });
      }
    }
  },
);
