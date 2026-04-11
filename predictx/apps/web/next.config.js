const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@predictx/shared", "styled-jsx"],
  images: {
    domains: ["api.dicebear.com"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // MetaMask SDK (pulled in by wagmi connectors) imports React Native storage.
    // Stub it out so the web bundle compiles without warnings.
    config.resolve.alias["@react-native-async-storage/async-storage"] =
      path.resolve(__dirname, "src/stubs/async-storage.js");

    // Stub out Farcaster and Solana modules that are not used in this project
    // to prevent build errors from the latest Privy library version.
    config.resolve.alias["@farcaster/mini-app-solana"] = false;
    config.resolve.alias["@farcaster/mini-app-sdk"] = false;

    return config;
  },
};

module.exports = nextConfig;
