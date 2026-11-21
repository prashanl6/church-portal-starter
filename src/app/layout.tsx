import './globals.css';
import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DialogHost } from '@/components/Dialog';

export const metadata: Metadata = {
  title: 'Mount Lavinia Methodist Church',
  description: 'Notices, sermons, hall bookings and church resources.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f5f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inter is the fallback for devices without Apple's system font. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
          {children}
        </main>
        <Footer />
        <DialogHost />
      </body>
    </html>
  );
}
