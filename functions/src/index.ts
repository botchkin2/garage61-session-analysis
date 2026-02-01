import axios, {AxiosRequestConfig} from 'axios';
import {defineSecret} from 'firebase-functions/params';
import {onRequest} from 'firebase-functions/v2/https';

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
          // Also exclude Authorization header since we use Firebase secrets
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
                  'authorization', // Exclude client Authorization header
                ].includes(key.toLowerCase()),
            ),
          ),
        },
        params: req.query,
        timeout: req.path?.includes('/csv') ? 60000 : 30000, // 60 seconds for CSV downloads, 30 for others
        responseType: req.path?.includes('/csv') ? 'stream' : undefined, // Stream large CSV responses
      };

      // Add body for non-GET requests
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        axiosConfig.data = req.body;
      }

      console.log(`Proxying ${req.method} ${req.path} -> ${targetUrl}`);
      console.log(`Request headers:`, JSON.stringify(req.headers, null, 2));
      console.log(`Target URL: ${targetUrl}`);
      console.log(`Is CSV request: ${req.path.includes('/csv')}`);

      let response;
      try {
        console.log(`Making axios request to: ${targetUrl}`);
        console.log(`Axios config:`, {
          method: axiosConfig.method,
          url: axiosConfig.url,
          timeout: axiosConfig.timeout,
          headers: axiosConfig.headers,
        });
        response = await axios(axiosConfig);
        console.log(`Upstream response received: ${response.status}`);
      } catch (upstreamError: any) {
        console.error(`Upstream error connecting to ${targetUrl}:`, {
          message: upstreamError.message,
          code: upstreamError.code,
          errno: upstreamError.errno,
          syscall: upstreamError.syscall,
          hostname: upstreamError.hostname,
          status: upstreamError.response?.status,
          statusText: upstreamError.response?.statusText,
          data: upstreamError.response?.data,
          stack: upstreamError.stack,
        });
        throw upstreamError;
      }

      // Forward the response with minimal header processing
      const contentType = response.headers['content-type'] || '';
      const isCsv =
        contentType.includes('text/csv') ||
        contentType.includes('application/csv');

      console.log(`Response content-type: ${contentType}, isCsv: ${isCsv}`);

      // Only forward essential headers, avoid transfer-encoding conflicts
      const headersToForward = [
        'content-type',
        'content-length',
        'cache-control',
        'last-modified',
      ];
      headersToForward.forEach(headerName => {
        const headerValue = response.headers[headerName];
        if (headerValue) {
          res.set(headerName, headerValue as string);
        }
      });

      // For CSV responses, add no-cache header
      if (isCsv) {
        res.set('Cache-Control', 'no-cache');
      }

      // Send response - let Firebase handle the rest
      console.log(`Sending response with status ${response.status}`);
      res.status(response.status).send(response.data);
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
