/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force browserslist → caniuse-lite to the right file even in weird monorepo/hoist states
  webpack: (config) => {
    // Multiple alias strategies to ensure caniuse-lite resolution
    const caniusePath = require.resolve('caniuse-lite/dist/unpacker/agents.js');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      'caniuse-lite/dist/unpacker/agents': caniusePath,
      'caniuse-lite/dist/unpacker/agents.js': caniusePath,
    };
    
    // Add fallback for any caniuse-lite resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'caniuse-lite/dist/unpacker/agents': caniusePath,
    };
    
    return config;
  },
  // Environment variables configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Headers for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
