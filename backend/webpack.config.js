const path = require('path');

module.exports = (options) => ({
  ...options,
  resolve: {
    ...options.resolve,
    alias: {
      ...options.resolve?.alias,
      '@agent':     path.resolve(__dirname, 'src/agent'),
      '@tools':     path.resolve(__dirname, 'src/tools'),
      '@documents': path.resolve(__dirname, 'src/documents'),
    },
  },
});
