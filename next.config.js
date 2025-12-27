const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@zama-fhe/relayer-sdk/bundle': 'commonjs @zama-fhe/relayer-sdk/bundle',
      });
    }

    return config;
  },
};

module.exports = nextConfig;

