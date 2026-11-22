// Wraps every admin page. Staff accounts see a short note, and the buttons only
// administrators can use (class "admin-only") are hidden from them by globals.css.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="staff-banner" role="note">
        You are signed in as staff. You can view everything here. Only administrators can make or approve changes.
      </p>
      {children}
    </>
  );
}
