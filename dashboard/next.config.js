/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Required for CesiumJS
  webpack: (config, { isServer }) => {
    // Handle Cesium's static assets
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      url: false,
    };
    
    return config;
  },
  
  // Cesium requires these headers for SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  
  // Environment variable passthrough
  env: {
    NEXT_PUBLIC_GESTURE_WS_URL: process.env.NEXT_PUBLIC_GESTURE_WS_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MCP_SERVERS: process.env.NEXT_PUBLIC_MCP_SERVERS,
    NEXT_PUBLIC_ENABLE_VOICE: process.env.NEXT_PUBLIC_ENABLE_VOICE,
    NEXT_PUBLIC_ENABLE_CESIUM: process.env.NEXT_PUBLIC_ENABLE_CESIUM,
    NEXT_PUBLIC_CESIUM_TOKEN: process.env.NEXT_PUBLIC_CESIUM_TOKEN,
  },
};

module.exports = nextConfig;
