const { createProxyMiddleware } = require('http-proxy-middleware');

const proxyPort = process.env.PROXY_PORT || '3001';

module.exports = function(app) {
  for (const routePrefix of ['/api', '/redirect']) {
    app.use(
      routePrefix,
      createProxyMiddleware({
        target: `http://127.0.0.1:${proxyPort}`,
        changeOrigin: true,
      })
    );
  }
};
