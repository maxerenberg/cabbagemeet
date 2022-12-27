const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  for (const routePrefix of ['/api', '/redirect']) {
    app.use(
      routePrefix,
      createProxyMiddleware({
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      })
    );
  }
};
