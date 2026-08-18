import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OneMedical Healthcare — Personalized Physiotherapy & Rehab',
    short_name: 'OneMedical',
    description:
      'Clinical-grade physiotherapy, personalized rehabilitation programs, and virtual specialist consultations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#003D9B',
    icons: [
      {
        src: '/images/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
