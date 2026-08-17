import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneMedical — Move Better. Recover Faster. Live Pain-Free.",
  description:
    "Clinical-grade physiotherapy, personalized rehabilitation programs, and virtual specialist consultations tailored to your recovery journey.",
  keywords: [
    "physiotherapy",
    "rehabilitation",
    "sports injuries",
    "back pain",
    "online physiotherapy",
    "home physiotherapy",
    "OneMedical",
  ],
  authors: [{ name: "OneMedical Healthcare Systems" }],
  icons: {
    icon: "/images/favicon.png",
  },
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
