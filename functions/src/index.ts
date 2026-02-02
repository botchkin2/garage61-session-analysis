import axios from 'axios';
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
      // Get API token
      const apiToken = garage61ApiToken.value();
      if (!apiToken) {
        res.status(500).json({error: 'API token not configured'});
        return;
      }

      // Build target URL
      const apiPath = req.path.replace(/^\/api\/garage61/, '');
      const targetUrl = `https://garage61.net/api/v1${apiPath}`;

      // Make request to garage61.net
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': req.headers['content-type'] || 'application/json',
        },
        params: req.query,
        data: req.body,
        timeout: 30000,
      });

      // Forward all response headers
      Object.keys(response.headers).forEach(key => {
        res.set(key, response.headers[key] as string);
      });

      // Send response
      res.status(response.status).send(response.data);
    } catch (error: any) {
      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        res.status(502).json({error: 'Bad Gateway'});
      }
    }
  },
);
