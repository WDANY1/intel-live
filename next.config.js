/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow embedding YouTube, webcam sites
  images: {
    domains: [
      'img.youtube.com',
      'i.ytimg.com',
      'www.aljazeera.com',
      'www.bbc.com',
      'www.reuters.com',
    ],
    unoptimized: true,
  },
  // Headers for embedding
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, x-api-key' },
        ],
      },
    ]
  },
  // Transpile Three.js and Globe.gl for proper bundling
  transpilePackages: ['three', 'globe.gl'],
  webpack: (config) => {
    config.externals = config.externals || []
    return config
  },
}

module.exports = nextConfig
