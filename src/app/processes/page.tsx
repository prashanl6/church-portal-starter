'use client';
import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import type { ProcessAudience } from '@/lib/processAudience';

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
    <fieldset className="grid gap-2">
      <legend className="label mb-0">Tag (required)</legend>
      <p className="text-xs text-gray-600">
        <strong>Public</strong> — listed for everyone, including without a login. <strong>Steward</strong> — listed only
        for users who are logged in.
      </p>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="radio" name={name} value="public" checked={value === 'public'} onChange={() => onChange('public')} />
        Public
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="radio" name={name} value="steward" checked={value === 'steward'} onChange={() => onChange('steward')} />
        Steward
      </label>
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
      <div style={{ minHeight: '100vh' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            height: '2.5rem',
            backgroundColor: 'rgb(226, 232, 240)',
            borderRadius: '0.5rem',
            width: '12rem',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '5rem',
              backgroundColor: 'rgb(241, 245, 249)',
              borderRadius: '0.5rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (editingId) {
    const process = processes.find(p => p.id === editingId);
    return (
      <div style={{ minHeight: '100vh' }}>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={cancelEdit}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                padding: 0,
                flexShrink: 0
              }}
              title="Cancel editing"
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="page-title" style={{ margin: 0, flex: 1 }}>Edit Process Document</h1>
          </div>
          <form onSubmit={handleUpdate} className="grid gap-4">
            <div>
              <label className="label">Title</label>
              <input
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
              <div style={{ borderTop: '1px solid rgb(226, 232, 240)', paddingTop: '1rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Attached documents (Excel / Word)</h2>
                <p style={{ fontSize: '0.875rem', color: 'rgb(100, 116, 139)', marginBottom: '0.5rem' }}>
                  New files upload when you submit. Removals apply only after this update is approved.
                </p>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'rgb(120, 53, 15)',
                    background: 'rgb(255, 251, 235)',
                    border: '1px solid rgb(253, 230, 138)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  Files you remove stay on the live document until an approver approves this edit.
                </p>
                {(process.attachments ?? []).length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'rgb(100, 116, 139)' }}>No files attached yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'grid', gap: '0.5rem' }}>
                    {(process.attachments ?? []).map((a) => {
                      const marked = editPendingRemoveIds.includes(a.id);
                      return (
                        <li
                          key={a.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.875rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: marked ? '1px solid rgb(253, 230, 138)' : '1px solid rgb(226, 232, 240)',
                            background: marked ? 'rgb(255, 251, 235)' : 'rgb(248, 250, 252)',
                          }}
                        >
                          <a
                            href={a.storedPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'rgb(37, 99, 235)',
                              textDecoration: marked ? 'line-through' : undefined,
                              opacity: marked ? 0.85 : 1,
                            }}
                          >
                            {a.fileName}
                          </a>
                          {formatBytes(a.byteSize) && (
                            <span style={{ color: 'rgb(148, 163, 184)' }}>{formatBytes(a.byteSize)}</span>
                          )}
                          {marked ? (
                            <>
                              <span style={{ fontSize: '0.75rem', color: 'rgb(146, 64, 14)' }}>Pending removal</span>
                              <button
                                type="button"
                                onClick={() => setEditPendingRemoveIds((prev) => prev.filter((x) => x !== a.id))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'rgb(37, 99, 235)',
                                  cursor: 'pointer',
                                  fontSize: '0.8125rem',
                                  textDecoration: 'underline',
                                  padding: 0,
                                }}
                              >
                                Undo
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setEditPendingRemoveIds((prev) => (prev.includes(a.id) ? prev : [...prev, a.id]))
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgb(220, 38, 38)',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                textDecoration: 'underline',
                                padding: 0,
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <label className="label" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Add Excel / Word files (optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept={FILE_INPUT_ACCEPT}
                  style={{ fontSize: '0.875rem' }}
                  onChange={(e) => {
                    const next = Array.from(e.target.files || []);
                    e.target.value = '';
                    if (next.length) setEditPendingFiles((prev) => [...prev, ...next]);
                  }}
                />
                {editPendingFiles.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '0.5rem', margin: '0.75rem 0 0', background: 'rgb(248, 250, 252)', borderRadius: '0.375rem', border: '1px solid rgb(226, 232, 240)', fontSize: '0.875rem' }}>
                    {editPendingFiles.map((f, i) => (
                      <li key={`${f.name}-${i}-${f.size}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setEditPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: 'rgb(220, 38, 38)', cursor: 'pointer', fontSize: '0.8125rem', flexShrink: 0 }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button className="btn w-fit" type="submit">Submit Update for Approval</button>
              <button className="btn-secondary w-fit" type="button" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (selectedProcess) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div className="card" style={{
          marginBottom: '2rem',
          animation: 'slideIn 0.4s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <button
                onClick={() => setSelectedProcess(null)}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.5rem',
                  height: '2.5rem',
                  padding: 0,
                  flexShrink: 0
                }}
                title="Back to processes"
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div style={{ flex: 1 }}>
                <h1 className="page-title" style={{
                  fontSize: '1.75rem',
                  marginBottom: '0.5rem',
                  marginTop: 0
                }}>{selectedProcess.title}</h1>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'rgb(100, 116, 139)',
                  margin: 0
                }}>
                  {isLoggedIn && (
                    <>
                      Tag: {selectedProcess.audience === 'steward' ? 'Steward' : 'Public'}
                      {' · '}
                    </>
                  )}
                  Version {selectedProcess.version} · Updated {new Date(selectedProcess.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEdit(selectedProcess)}
                  className="btn"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedProcess.id, selectedProcess.title)}
                  className="btn btn-delete"
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Documents</h2>
            {(selectedProcess.attachments ?? []).length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'rgb(100, 116, 139)', margin: 0 }}>No Excel or Word attachments.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {(selectedProcess.attachments ?? []).map((a) => (
                  <li
                    key={a.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.9375rem',
                    }}
                  >
                    <a
                      href={a.storedPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'rgb(37, 99, 235)', fontWeight: 500 }}
                    >
                      {a.fileName}
                    </a>
                    {formatBytes(a.byteSize) && (
                      <span style={{ fontSize: '0.8125rem', color: 'rgb(148, 163, 184)' }}>{formatBytes(a.byteSize)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && (
              <p style={{ fontSize: '0.8125rem', color: 'rgb(100, 116, 139)', marginTop: '0.75rem', marginBottom: 0 }}>
                To add or remove attachments, use <strong>Edit</strong>.
              </p>
            )}
          </div>

          <article 
            className="notice-content"
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.75,
              color: 'rgb(55, 65, 81)'
            }}
            dangerouslySetInnerHTML={{ __html: selectedProcess.contentHtml }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Process Documents</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            View and manage church process documents.
            {!isLoggedIn
              ? ' Only public documents are listed — sign in to see steward documents.'
              : ' Signed in — public and steward documents are listed.'}
          </p>
        </div>

        {processes.length === 0 ? (
          <div className="card" style={{
            textAlign: 'center',
            paddingTop: '3rem',
            paddingBottom: '3rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <p style={{
              color: 'rgb(100, 116, 139)',
              fontSize: '1.125rem',
              margin: 0
            }}>No process documents available</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {processes.map((process, index) => (
              <div
                key={process.id}
                className="card"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                  padding: '1.5rem'
                }}
              >
                <button
                  onClick={() => setSelectedProcess(process)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h2 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'rgb(15, 23, 42)',
                      margin: 0,
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}>
                      {process.title}
                      {isLoggedIn && process.audience === 'steward' && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: 'rgb(237, 233, 254)',
                            color: 'rgb(91, 33, 182)',
                          }}
                        >
                          Steward
                        </span>
                      )}
                    </h2>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'rgb(100, 116, 139)',
                      margin: 0
                    }}>
                      Version {process.version} · Updated {new Date(process.updatedAt).toLocaleDateString()}
                      {(process.attachments ?? []).length > 0
                        ? ` · ${(process.attachments ?? []).length} file${(process.attachments ?? []).length !== 1 ? 's' : ''}`
                        : ''}
                    </p>
                  </div>
                  <svg style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: 'rgb(148, 163, 184)',
                    flexShrink: 0,
                    marginTop: '0.25rem'
                  }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(process);
                      }}
                      className="btn"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(process.id, process.title);
                      }}
                      className="btn btn-delete"
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

