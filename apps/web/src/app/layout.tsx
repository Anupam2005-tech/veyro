import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veyro — Your Keys. Our Pro. Zero Traffic Stress.',
  description: 'Veyro connects customer-owned vehicles with independent professional drivers on demand or scheduled.',
  icons: {
    icon: '/icons/veyro-dark-32.png',
    apple: '/icons/veyro-dark-180.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-night-canvas text-night-text selection:bg-night-accent selection:text-night-accent-ink">
        {children}
      </body>
    </html>
  );
}

