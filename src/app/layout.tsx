import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, width: '100%' }}>
      <body style={{ margin: 0, padding: 0, width: '100%', overflow: 'hidden' }}>
        <header className="app-header">
          <div className="app-header-inner">
            <div>
              <div className="app-title">Church Portal</div>
              <p className="app-subtitle">
                Simple tools for staff & members
              </p>
            </div>
            <nav className="app-nav">
              <Link className="app-nav-link" href="/">Home</Link>
              <Link className="app-nav-link" href="/notices">Notices</Link>
              <Link className="app-nav-link" href="/sermons">Sermons</Link>
              <Link className="app-nav-link" href="/book-hall">Book Hall</Link>
              <Link className="app-nav-link" href="/login">Staff Login</Link>
            </nav>
          </div>
        </header>
        <main className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem', display: 'block' }}>
          {children}
        </main>
      </body>
    </html>
  );
}