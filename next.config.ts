import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Remove dangerous ignore flags
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
  experimental: {
    allowedDevOrigins: [
      '*.cluster-zsqzu5kebnaemxbyqrvoim2lxo.cloudworkstations.dev',
      '*.cluster-omu5xfjeevhmgwf75twfksi4vc.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;

