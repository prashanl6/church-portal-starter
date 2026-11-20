// Navigation lives only in the header, so the footer just names the church.
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
            Mount Lavinia Methodist Church
          </div>
          <div>© {new Date().getFullYear()} · All are welcome.</div>
        </div>
      </div>
    </footer>
  );
}
