const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api/stacks/*",
    createProxyMiddleware({
      target: "http://localhost:3030/",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/deploy/*",
    createProxyMiddleware({
      target: "http://localhost:3030/",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/destroy/*",
    createProxyMiddleware({
      target: "http://localhost:3030/",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/*",
    createProxyMiddleware({
      target: "http://localhost:3000/",
      changeOrigin: true,
    }),
  );
};
