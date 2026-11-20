'use client';
import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import type { ProcessAudience } from '@/lib/processAudience';
import { PageHeader, EmptyState, Alert, SkeletonList, RowChevron, longDate } from '@/components/ui';
import { IconBook, IconNotice } from '@/components/Icons';
import Reveal from '@/components/Reveal';

interface Attachment {
  id: number;
  fileName: string;
  storedPath: string;
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
}

interface Process {
  id: number;
  title: string;
  contentHtml: string;
  version: number;
  status: string;
  audience: ProcessAudience;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

const FILE_INPUT_ACCEPT =
  '.xls,.xlsx,.doc,.docx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mapApiProcess(raw: unknown): Process {
  const p = raw as Record<string, unknown>;
  const row = p as unknown as Process;
  return {
    ...row,
    audience: p.audience === 'steward' ? 'steward' : 'public',
    attachments: Array.isArray(p.attachments) ? (p.attachments as Attachment[]) : [],
  };
}

function AudienceRadios(props: {
  value: ProcessAudience;
  onChange: (v: ProcessAudience) => void;
  name: string;
}) {
  const { value, onChange, name } = props;
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label">Who can see this? (required)</legend>
      <div className="segmented" role="radiogroup">
        {(['public', 'steward'] as const).map((v) => (
          <label key={v} className={value === v ? 'is-active' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: 44, padding: '0 1.1rem', borderRadius: 12, cursor: 'pointer', fontWeight: 500 }}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {v === 'public' ? 'Public' : 'Steward'}
          </label>
        ))}
      </div>
      <p className="hint">
        <strong>Public</strong>: everyone can see it, without logging in. <strong>Steward</strong>: only people who are
        logged in can see it.
      </p>
    </fieldset>
  );
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; contentHtml: string; audience: ProcessAudience }>({
    title: '',
    contentHtml: '',
    audience: 'public',
  });
  const [editPendingFiles, setEditPendingFiles] = useState<File[]>([]);
  const [editPendingRemoveIds, setEditPendingRemoveIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authRes = await fetch('/api/auth/check', { credentials: 'same-origin' });
        const loggedIn = authRes.ok;
        if (!cancelled) {
          setIsLoggedIn(loggedIn);
          if (loggedIn) {
            const data = await authRes.json();
            setIsAdmin(data.role === 'admin');
          } else {
            setIsAdmin(false);
          }
        }
        const res = await fetch('/api/processes', { credentials: 'same-origin' });
        const data = await res.json();
        if (!cancelled) {
          setProcesses((data.list || []).map((p: unknown) => mapApiProcess(p)));
        }
      } catch (error) {
        console.error('Failed to load processes:', error);
        if (!cancelled) {
          setIsAdmin(false);
          setIsLoggedIn(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (processId: number, processTitle: string) => {
    if (!window.confirm(`Are you sure you want to request deletion of process "${processTitle}"? This will require approval before the process is deleted.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/processes/${processId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.ok) {
        alert('Delete request submitted for approval');
        // Refresh processes list
        const processesRes = await fetch('/api/processes', { credentials: 'same-origin' });
        const processesData = await processesRes.json();
        setProcesses((processesData.list || []).map((p: unknown) => mapApiProcess(p)));
        if (selectedProcess?.id === processId) {
          setSelectedProcess(null);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to submit delete request' }));
        alert(errorData.error || 'Failed to submit delete request');
      }
    } catch (error) {
      alert('Failed to submit delete request');
    }
  };

  const handleEdit = (process: Process) => {
    const aud: ProcessAudience = process.audience === 'steward' ? 'steward' : 'public';
    setEditForm({ title: process.title, contentHtml: process.contentHtml, audience: aud });
    setEditPendingFiles([]);
    setEditPendingRemoveIds([]);
    setEditingId(process.id);
    setSelectedProcess(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.contentHtml.trim()) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/processes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...editForm,
          removeAttachmentIds: editPendingRemoveIds,
        }),
      });
      if (res.ok) {
        const id = editingId;
        const filesToUpload = editPendingFiles;
        const hadNewFiles = filesToUpload.length > 0;
        const hadScheduledRemovals = editPendingRemoveIds.length > 0;
        const uploadErrors: string[] = [];
        if (id != null && hadNewFiles) {
          for (const f of filesToUpload) {
            const fd = new FormData();
            fd.append('file', f);
            const up = await fetch(`/api/admin/processes/${id}/attachments`, {
              method: 'POST',
              body: fd,
              credentials: 'same-origin',
            });
            const upBody = await up.json().catch(() => ({}));
            if (!up.ok) {
              uploadErrors.push(`${f.name}: ${upBody.error || 'upload failed'}`);
            }
          }
        }
        setEditPendingFiles([]);
        setEditPendingRemoveIds([]);
        setEditForm({ title: '', contentHtml: '', audience: 'public' });
        setEditingId(null);
        const processesRes = await fetch('/api/processes', { credentials: 'same-origin' });
        const processesData = await processesRes.json();
        setProcesses((processesData.list || []).map((p: unknown) => mapApiProcess(p)));
        if (uploadErrors.length) {
          alert(
            `Update request submitted for approval.\n\nSome new files could not be uploaded:\n${uploadErrors.join('\n')}`
          );
        } else {
          const parts = ['Update request submitted for approval.'];
          if (hadNewFiles) parts.push('New files were uploaded.');
          if (hadScheduledRemovals) parts.push('Marked files will be removed after approval.');
          alert(parts.join(' '));
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to submit update request' }));
        alert(errorData.error || 'Failed to submit update request');
      }
    } catch (error) {
      alert('Failed to submit update request');
    }
  };

  const cancelEdit = () => {
    setEditForm({ title: '', contentHtml: '', audience: 'public' });
    setEditPendingFiles([]);
    setEditPendingRemoveIds([]);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 48, width: '16rem' }} />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (editingId) {
    const process = processes.find(p => p.id === editingId);
    return (
      <div className="page panel-enter">
        <div>
          <button type="button" onClick={cancelEdit} className="back-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            Back to processes
          </button>
          <PageHeader
            title="Edit Process Document"
            subtitle="Your changes are sent to a second administrator. They go live only after approval."
          />
        </div>
        <form onSubmit={handleUpdate} className="card form-grid">
          <div>
            <label className="label" htmlFor="public-edit-title">Title</label>
            <input
              id="public-edit-title"
              className="input"
              type="text"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
          </div>
          <AudienceRadios
            name="public-edit-process-audience"
            value={editForm.audience}
            onChange={(audience) => setEditForm({ ...editForm, audience })}
          />
          <div>
            <label className="label">Content</label>
            <RichTextEditor
              value={editForm.contentHtml}
              onChange={(value) => setEditForm({ ...editForm, contentHtml: value })}
              placeholder="Enter process document content. Use the toolbar to format text with bold, italic, underline, colors, and more..."
            />
          </div>
          {process && isAdmin && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }} className="stack">
              <div>
                <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>Attached documents (Excel / Word)</h2>
                <p className="hint" style={{ marginTop: 0 }}>
                  New files upload when you submit. Removals apply only after this update is approved.
                </p>
              </div>
              <Alert tone="warning">Files you remove stay on the live document until an approver approves this edit.</Alert>
              {(process.attachments ?? []).length === 0 ? (
                <p style={{ color: 'var(--text-3)', margin: 0 }}>No files attached yet.</p>
              ) : (
                <div className="list-group">
                  {(process.attachments ?? []).map((a) => {
                    const marked = editPendingRemoveIds.includes(a.id);
                    return (
                      <div key={a.id} className="list-row" style={{ cursor: 'default', background: marked ? '#fbf1e1' : undefined }}>
                        <span className="list-row-main">
                          <a
                            href={a.storedPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="list-row-title"
                            style={{ color: 'var(--accent)', textDecoration: marked ? 'line-through' : undefined }}
                          >
                            {a.fileName}
                          </a>
                          <span className="list-row-meta">
                            {formatBytes(a.byteSize)}
                            {marked && <> {formatBytes(a.byteSize) ? '· ' : ''}<span className="badge badge-amber">Pending removal</span></>}
                          </span>
                        </span>
                        {marked ? (
                          <button
                            type="button"
                            className="btn-quiet"
                            onClick={() => setEditPendingRemoveIds((prev) => prev.filter((x) => x !== a.id))}
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-quiet danger"
                            onClick={() =>
                              setEditPendingRemoveIds((prev) => (prev.includes(a.id) ? prev : [...prev, a.id]))
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div>
                <label className="label" htmlFor="public-edit-files">Add Excel / Word files (optional)</label>
                <input
                  id="public-edit-files"
                  type="file"
                  multiple
                  accept={FILE_INPUT_ACCEPT}
                  className="input"
                  style={{ paddingTop: '0.7rem' }}
                  onChange={(e) => {
                    const next = Array.from(e.target.files || []);
                    e.target.value = '';
                    if (next.length) setEditPendingFiles((prev) => [...prev, ...next]);
                  }}
                />
                <p className="hint">Excel or Word only, up to 4 MB each.</p>
              </div>
              {editPendingFiles.length > 0 && (
                <div className="list-group">
                  {editPendingFiles.map((f, i) => (
                    <div key={`${f.name}-${i}-${f.size}`} className="list-row" style={{ cursor: 'default', minHeight: 56 }}>
                      <span className="list-row-main" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span className="list-row-title" style={{ fontWeight: 500 }}>{f.name}</span>
                        <span className="list-row-meta">Will upload when you submit</span>
                      </span>
                      <button
                        type="button"
                        className="btn-quiet danger"
                        onClick={() => setEditPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn" type="submit">Submit Update for Approval</button>
            <button className="btn-secondary" type="button" onClick={cancelEdit}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  if (selectedProcess) {
    const files = selectedProcess.attachments ?? [];
    return (
      <div className="page panel-enter">
        <div>
          <button type="button" onClick={() => setSelectedProcess(null)} className="back-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            All processes
          </button>
          <PageHeader
            title={selectedProcess.title}
            subtitle={
              <>
                {isLoggedIn && (
                  <span className={`badge ${selectedProcess.audience === 'steward' ? 'badge-blue' : ''}`} style={{ marginRight: '0.6rem' }}>
                    {selectedProcess.audience === 'steward' ? 'Steward' : 'Public'}
                  </span>
                )}
                Version {selectedProcess.version} · Updated {longDate(selectedProcess.updatedAt)}
              </>
            }
            actions={
              isAdmin ? (
                <>
                  <button onClick={() => handleEdit(selectedProcess)} className="btn-secondary">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProcess.id, selectedProcess.title)}
                    className="btn btn-delete"
                  >
                    Delete
                  </button>
                </>
              ) : undefined
            }
          />
        </div>

        <article
          className="card notice-content"
          dangerouslySetInnerHTML={{ __html: selectedProcess.contentHtml }}
        />

        <section>
          <h2 className="section-label">Documents</h2>
          {files.length === 0 ? (
            <p style={{ color: 'var(--text-3)', margin: 0 }}>No Excel or Word attachments.</p>
          ) : (
            <div className="list-group">
              {files.map((a) => (
                <a key={a.id} href={a.storedPath} target="_blank" rel="noopener noreferrer" className="list-row">
                  <span className="tile-icon" style={{ width: 44, height: 44, borderRadius: 12, margin: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <IconNotice size={22} />
                  </span>
                  <span className="list-row-main">
                    <span className="list-row-title">{a.fileName}</span>
                    <span className="list-row-meta">
                      Tap to open{formatBytes(a.byteSize) ? ` · ${formatBytes(a.byteSize)}` : ''}
                    </span>
                  </span>
                  <RowChevron />
                </a>
              ))}
            </div>
          )}
          {isAdmin && (
            <p className="hint">
              To add or remove attachments, use <strong>Edit</strong>.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Process Documents"
        subtitle={
          <>
            Step-by-step guides and forms for church activities.
            {!isLoggedIn
              ? ' Only public documents are listed — sign in to see steward documents.'
              : ' Signed in — public and steward documents are listed.'}
          </>
        }
      />

      {processes.length === 0 ? (
        <EmptyState icon={<IconBook />} title="No process documents available" text="New guides will appear here once they are published." />
      ) : (
        <Reveal>
          <div className="list-group">
            {processes.map((process) => {
              const count = (process.attachments ?? []).length;
              return (
                <div key={process.id} className="list-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedProcess(process)}
                    style={{
                      flex: '1 1 16rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      minHeight: 56,
                      background: 'none',
                      border: 0,
                      padding: 0,
                      font: 'inherit',
                      color: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="tile-icon" style={{ width: 48, height: 48, borderRadius: 14, margin: 0, background: '#e7f1f3', color: '#3e7480', flexShrink: 0 }}>
                      <IconBook size={24} />
                    </span>
                    <span className="list-row-main">
                      <span className="list-row-title">
                        {process.title}
                        {isLoggedIn && process.audience === 'steward' && (
                          <span className="badge badge-blue" style={{ marginLeft: '0.6rem', verticalAlign: 'middle' }}>Steward</span>
                        )}
                      </span>
                      <span className="list-row-meta">
                        Updated {longDate(process.updatedAt)}
                        {count > 0 ? ` · ${count} file${count !== 1 ? 's' : ''}` : ''}
                      </span>
                    </span>
                    <RowChevron />
                  </button>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(process);
                        }}
                        className="btn-quiet"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(process.id, process.title);
                        }}
                        className="btn-quiet danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>
      )}
    </div>
  );
}
