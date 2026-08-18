import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://onemedical.com';

export const viewport: Viewport = {
  themeColor: '#003D9B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'OneMedical — Move Better. Recover Faster. Live Pain-Free.',
    template: '%s | OneMedical Physiotherapy',
  },
  description:
    'Clinical-grade physiotherapy, personalized rehabilitation programs, and virtual specialist consultations tailored to your recovery journey. Certified physiotherapists and sports rehab experts.',
  keywords: [
    'physiotherapy',
    'physical therapy',
    'sports rehabilitation',
    'back pain treatment',
    'neck pain therapy',
    'post surgery rehab',
    'online physiotherapy consultation',
    'home visit physiotherapy',
    'joint mobility restoration',
    'clinical physiotherapy platform',
    'OneMedical',
  ],
  authors: [{ name: 'OneMedical Clinical Healthcare' }],
  creator: 'OneMedical Healthcare Systems',
  publisher: 'OneMedical',
  applicationName: 'OneMedical Healthcare',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'OneMedical — Move Better. Recover Faster. Live Pain-Free.',
    description:
      'Personalized rehabilitation programs guided by certified physiotherapists. Online video consultations, home visits, and clinic sessions.',
    siteName: 'OneMedical Healthcare',
    images: [
      {
        url: '/images/evidence-care-doctor.png',
        width: 1200,
        height: 630,
        alt: 'OneMedical Clinical-Grade Physiotherapy Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OneMedical — Move Better. Recover Faster. Live Pain-Free.',
    description:
      'Clinical-grade physiotherapy and personalized rehabilitation with certified therapists.',
    images: ['/images/evidence-care-doctor.png'],
    creator: '@OneMedical',
  },
  icons: {
    icon: [
      { url: '/images/favicon.png', type: 'image/png' },
      { url: '/images/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/images/favicon.png',
    apple: '/images/icon.png',
  },
};

// Schema.org Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'MedicalBusiness',
      '@id': `${siteUrl}/#organization`,
      name: 'OneMedical Healthcare',
      url: siteUrl,
      logo: `${siteUrl}/images/icon.png`,
      image: `${siteUrl}/images/evidence-care-doctor.png`,
      description:
        'Clinical-grade physiotherapy, personalized rehabilitation programs, and virtual specialist consultations.',
      telephone: '+91-800-123-4567',
      email: 'support@onemedical.com',
      priceRange: '₹₹',
      medicalSpecialty: [
        'Physiotherapy',
        'PhysicalTherapy',
        'SportsMedicine',
        'Rehabilitation',
      ],
      availableService: [
        {
          '@type': 'MedicalProcedure',
          name: 'Online Video Physiotherapy Consultation',
          procedureType: 'https://schema.org/NoninvasiveProcedure',
        },
        {
          '@type': 'MedicalProcedure',
          name: 'Home Visit Physiotherapy',
          procedureType: 'https://schema.org/NoninvasiveProcedure',
        },
        {
          '@type': 'MedicalProcedure',
          name: 'In-Clinic Physical Therapy & Rehab',
          procedureType: 'https://schema.org/NoninvasiveProcedure',
        },
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '12400',
        bestRating: '5',
        worstRating: '1',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'OneMedical',
      description: 'Move Better. Recover Faster. Live Pain-Free.',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/images/favicon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white text-sm"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
