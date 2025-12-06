import './globals.css';
import Header from '@/components/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, width: '100%' }}>
      <body style={{ margin: 0, padding: 0, width: '100%' }}>
        <Header />
        <main className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem', display: 'block' }}>
          {children}
        </main>
      </body>
    </html>
  );
}