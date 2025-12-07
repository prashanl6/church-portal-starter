import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, width: '100%' }}>
      <body style={{ margin: 0, padding: 0, width: '100%' }}>
        <Header />
        <main className="container" style={{ paddingTop: '1.5rem', paddingBottom: '5rem', display: 'block' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}