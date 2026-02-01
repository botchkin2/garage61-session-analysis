const {getDefaultConfig} = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure server with proxy
config.server = {
  ...config.server,
  enhanceMiddleware: middleware => {
    return (req, res, next) => {
      // Simple proxy for /api/garage61 routes
      if (req.url.startsWith('/api/garage61')) {
        const https = require('https');
        const url = require('url');

        // Rewrite the URL to point to garage61.net
        const targetUrl = req.url.replace('/api/garage61', '');
        // Build headers object, filtering out undefined values
        const headers = {
          host: 'garage61.net',
          'user-agent': req.headers['user-agent'] || 'Expo-Proxy/1.0',
          'accept-encoding': 'identity', // Disable compression
        };

        // Only include headers that have actual values
        if (req.headers.accept) headers['accept'] = req.headers.accept;
        if (req.headers['content-type'])
          headers['content-type'] = req.headers['content-type'];
        if (req.headers.authorization)
          headers['authorization'] = req.headers.authorization;

        const options = {
          protocol: 'https:',
          hostname: 'garage61.net',
          port: 443,
          path: `/api/v1${targetUrl}`,
          method: req.method,
          headers: headers,
        };

        const proxyReq = https.request(options, proxyRes => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', err => {
          console.error('Proxy error:', err);
          res.writeHead(500);
          res.end('Proxy error');
        });

        // Pipe the request body
        req.pipe(proxyReq);
        return;
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
