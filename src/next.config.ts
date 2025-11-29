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
  /*
  serverActions: {
    allowedOrigins: [
      "6000-firebase-studio-1764172302696.cluster-zsqzu5kebnaemxbyqrvoim2lxo.cloudworkstations.dev"
    ],
  },
  */
  // This allows requests from the development environment's preview URL.
  allowedDevOrigins: [
      "6000-firebase-studio-1764172302696.cluster-zsqzu5kebnaemxbyqrvoim2lxo.cloudworkstations.dev"
  ],
};

export default nextConfig;
