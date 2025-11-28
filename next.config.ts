import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This allows requests from the development environment's preview URL.
  allowedDevOrigins: [
      "https://*.cluster-zsqzu5kebnaemxbyqrvoim2lxo.cloudworkstations.dev"
  ],
  // Increase server action timeout for slow AI operations
  serverActions: {
      bodySizeLimit: '4.5mb',
      serverActionsBodySizeLimit: '4.5mb',
  }
};

export default nextConfig;
