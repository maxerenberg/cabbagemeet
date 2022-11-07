const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  for (const routePrefix of ['/api', '/redirect']) {
    app.use(
      routePrefix,
      createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
      })
    );
  }
};
