import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Syne } from 'next/font/google';
import { ServiceWorkerRegistrar } from '@/components/pwa/service-worker-registrar';
import { SessionProvider } from '@/lib/auth/session-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Veyro — Your Keys. Our Pro. Zero Traffic Stress.',
  description:
    'You own the ride. We bring the verified chauffeur — on demand or scheduled around your day.',
  applicationName: 'Veyro',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Veyro',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/veyro-dark-32.png',
    apple: '/icons/veyro-dark-180.png',
  },
  openGraph: {
    title: 'Veyro — Your Keys. Our Pro. Zero Traffic Stress.',
    description:
      'You own the ride. We bring the verified chauffeur — on demand or scheduled around your day.',
    type: 'website',
    images: [{ url: '/social/veyro-og-dark-1200x630.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veyro — Your Keys. Our Pro. Zero Traffic Stress.',
    description:
      'You own the ride. We bring the verified chauffeur — on demand or scheduled around your day.',
    images: ['/social/veyro-og-dark-1200x630.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#030407',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${syne.variable} ${jetbrainsMono.variable} font-body antialiased`}
      >
        <ServiceWorkerRegistrar />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
