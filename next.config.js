/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization disabled
  images: { 
    unoptimized: true 
  },
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  
  // Webpack configuration for PDF.js and canvas issues
  webpack: (config, { dev, isServer }) => {
    // Suppress specific warnings
    if (!dev) {
      config.stats = {
        warnings: false,
      };
    }
    
    // Fix for PDF.js canvas issues in server-side rendering
    if (isServer) {
      // Ignore canvas for server-side builds
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
      
      // Externalize PDF.js dependencies that cause issues
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
      });
    }
    
    // Additional PDF.js webpack configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      // Prevent canvas from being bundled
      canvas: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;