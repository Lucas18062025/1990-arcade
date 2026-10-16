export default {
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js']
  }
};