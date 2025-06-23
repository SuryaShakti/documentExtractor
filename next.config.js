/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
    // Optional: Specify directories to ignore
    // dirs: ['pages', 'utils']
  },
  
  // Ignore TypeScript errors during build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  
  // Image optimization disabled
  images: { 
    unoptimized: true 
  },
  
  // Suppress warnings during build (optional)
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    // Removed missingSuspenseWithCSRBailout as it's not supported in this Next.js version
  },
  
  // Webpack configuration to suppress warnings (optional)
  webpack: (config, { dev, isServer }) => {
    // Suppress specific warnings
    if (!dev) {
      config.stats = {
        warnings: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
