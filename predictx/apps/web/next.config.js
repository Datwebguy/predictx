const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@predictx/shared"],
  images: {
    domains: ["api.dicebear.com"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // MetaMask SDK (pulled in by wagmi connectors) imports React Native storage.
    // Stub it out so the web bundle compiles without warnings.
    config.resolve.alias["@react-native-async-storage/async-storage"] =
      path.resolve(__dirname, "src/stubs/async-storage.js");
    return config;
  },
};

module.exports = nextConfig;
