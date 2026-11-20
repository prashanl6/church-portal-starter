'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import RichTextEditor from '@/components/RichTextEditor';
import type { ProcessAudience } from '@/lib/processAudience';
import { PageHeader, ADMIN_BACK, EmptyState, Alert, SkeletonList, StatusBadge, RowChevron, longDate } from '@/components/ui';
import { IconBook, IconNotice, IconArrow } from '@/components/Icons';
import Reveal from '@/components/Reveal';

type Attachment = {
  id: number;
  fileName: string;
  storedPath: string;
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
};

type ProcessRow = {
  id: number;
  title: string;
  contentHtml: string;
  audience: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
};

type Screen = 'menu' | 'list' | 'add' | 'detail' | 'edit';

const fetcher = (url: string) => fetch(url, { credentials: 'same-origin' }).then((r) => r.json());

const FILE_INPUT_ACCEPT =
  '.xls,.xlsx,.doc,.docx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AudienceRadios(props: {
  value: ProcessAudience;
  onChange: (v: ProcessAudience) => void;
  name: string;
  disabled?: boolean;
}) {
  const { value, onChange, name, disabled } = props;
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label">Who can see this? (required)</legend>
      <div className="segmented" role="radiogroup">
        {(['public', 'steward'] as const).map((v) => (
          <label
            key={v}
            className={value === v ? 'is-active' : ''}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              minHeight: 44,
              padding: '0 1.1rem',
              borderRadius: 12,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              disabled={disabled}
            />
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

const fileIconStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  margin: 0,
  background: 'var(--accent-soft)',
  color: 'var(--accent)',
  flexShrink: 0,
};

export default function AdminProcessesPage() {
  const { data, mutate, isLoading } = useSWR<{ list?: ProcessRow[] }>('/api/admin/processes', fetcher);
  const list = data?.list ?? [];

  const [screen, setScreen] = useState<Screen>('menu');
  const [selected, setSelected] = useState<ProcessRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [addForm, setAddForm] = useState<{
    title: string;
    contentHtml: string;
    audience: ProcessAudience;
  }>({ title: '', contentHtml: '', audience: 'public' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  /** Files chosen on the add form; uploaded right after the process is created. */
  const [addPendingFiles, setAddPendingFiles] = useState<File[]>([]);

  const [editForm, setEditForm] = useState<{
    title: string;
    contentHtml: string;
    audience: ProcessAudience;
  }>({ title: '', contentHtml: '', audience: 'public' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  /** New files chosen on the edit form; uploaded after the update request succeeds. */
  const [editPendingFiles, setEditPendingFiles] = useState<File[]>([]);
  /** Attachment IDs to delete only after the edit is approved */
  const [editPendingRemoveIds, setEditPendingRemoveIds] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/check', { credentials: 'same-origin' });
        if (res.ok) {
          const j = await res.json();
          setIsAdmin(j.role === 'admin');
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setRoleChecked(true);
      }
    })();
  }, []);

  const refreshList = async () => {
    await mutate();
  };

  const openDetail = (p: ProcessRow) => {
    setSelected(p);
    setScreen('detail');
  };

  const startEdit = (p: ProcessRow) => {
    setEditId(p.id);
    const aud: ProcessAudience = p.audience === 'steward' ? 'steward' : 'public';
    setEditForm({ title: p.title, contentHtml: p.contentHtml, audience: aud });
    setEditPendingFiles([]);
    setEditPendingRemoveIds([]);
    setScreen('edit');
  };

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.title.trim() || !addForm.contentHtml.trim()) {
      alert('Please fill in title and content');
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch('/api/admin/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(addForm),
      });
      if (res.status === 401 || res.status === 403) {
        alert('Your session has expired or you need admin access.');
        window.location.href = '/login';
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || 'Failed to create process');
        return;
      }
      const newId = typeof body.id === 'number' ? body.id : null;
      const filesToUpload = addPendingFiles;
      const hadFiles = filesToUpload.length > 0;
      const uploadErrors: string[] = [];
      if (newId != null && hadFiles) {
        for (const f of filesToUpload) {
          const fd = new FormData();
          fd.append('file', f);
          const up = await fetch(`/api/admin/processes/${newId}/attachments`, {
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
      setAddForm({ title: '', contentHtml: '', audience: 'public' });
      setAddPendingFiles([]);
      await refreshList();
      if (uploadErrors.length) {
        alert(
          `Process submitted for approval.\n\nSome files could not be uploaded:\n${uploadErrors.join('\n')}`
        );
      } else {
        alert(
          hadFiles
            ? 'Process submitted for approval. Attached files were uploaded.'
            : 'Process submitted for approval.'
        );
      }
    } finally {
      setAddSubmitting(false);
    }
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (editId == null) return;
    if (!editForm.title.trim() || !editForm.contentHtml.trim()) {
      alert('Please fill in title and content');
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/admin/processes/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...editForm,
          removeAttachmentIds: editPendingRemoveIds,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        alert('Admin access required.');
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || 'Failed to submit update');
        return;
      }
      const filesToUpload = editPendingFiles;
      const hadNewFiles = filesToUpload.length > 0;
      const hadScheduledRemovals = editPendingRemoveIds.length > 0;
      const uploadErrors: string[] = [];
      if (hadNewFiles) {
        for (const f of filesToUpload) {
          const fd = new FormData();
          fd.append('file', f);
          const up = await fetch(`/api/admin/processes/${editId}/attachments`, {
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
      await refreshList();
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
      setEditId(null);
      setScreen('list');
    } finally {
      setEditSubmitting(false);
    }
  };

  const requestDelete = async (p: ProcessRow) => {
    if (!window.confirm(`Request deletion of "${p.title}"? This requires approval.`)) return;
    try {
      const res = await fetch(`/api/admin/processes/${p.id}`, { method: 'DELETE', credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || 'Failed');
        return;
      }
      alert('Delete request submitted for approval');
      setSelected(null);
      setScreen('list');
      await refreshList();
    } catch {
      alert('Failed');
    }
  };

  const uploadFile = async (processId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/admin/processes/${processId}/attachments`, {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error || 'Upload failed');
      return;
    }
    await refreshList();
    const refreshed = (await fetcher('/api/admin/processes')) as { list?: ProcessRow[] };
    const found = refreshed.list?.find((x) => x.id === processId);
    if (found && selected?.id === processId) setSelected(found);
  };

  const removeAttachment = async (processId: number, attachmentId: number) => {
    if (!window.confirm('Remove this file from the process?')) return;
    const res = await fetch(`/api/admin/processes/${processId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || 'Failed to remove');
      return;
    }
    await refreshList();
    const refreshed = (await fetcher('/api/admin/processes')) as { list?: ProcessRow[] };
    const found = refreshed.list?.find((x) => x.id === processId);
    if (found && selected?.id === processId) setSelected(found);
  };

  const renderAttachments = (
    processId: number,
    attachments: Attachment[],
    readOnly: boolean,
    opts?: {
      immediateUpload?: boolean;
      deferredRemovePendingIds?: number[];
      onDeferRemove?: (attachmentId: number) => void;
      onUndoDeferredRemove?: (attachmentId: number) => void;
    }
  ) => {
    const immediateUpload = opts?.immediateUpload !== false;
    const deferPending = opts?.deferredRemovePendingIds ?? [];
    const useDeferredRemove = Boolean(opts?.onDeferRemove && opts?.onUndoDeferredRemove);
    return (
      <div className="stack">
        <div>
          <h2 className="section-label" style={{ marginBottom: '0.3rem' }}>Attached documents (Excel / Word)</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            .xls, .xlsx, .doc, .docx — up to 4 MB each. Files open in a new tab.
          </p>
        </div>
        {useDeferredRemove && (
          <Alert tone="warning">
            Removing a file here takes effect only after this update is <strong>approved</strong>. Until then it stays on
            the live process.
          </Alert>
        )}
        {attachments.length === 0 ? (
          <p style={{ color: 'var(--text-3)', margin: 0 }}>No files attached yet.</p>
        ) : (
          <div className="list-group">
            {attachments.map((a) => {
              const marked = deferPending.includes(a.id);
              return (
                <div
                  key={a.id}
                  className="list-row"
                  style={{ cursor: 'default', flexWrap: 'wrap', background: marked ? '#fbf1e1' : undefined }}
                >
                  <span className="tile-icon" style={fileIconStyle}>
                    <IconNotice size={22} />
                  </span>
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
                      {marked && (
                        <span className="badge badge-amber" style={{ marginLeft: formatBytes(a.byteSize) ? '0.5rem' : 0 }}>
                          Pending removal
                        </span>
                      )}
                    </span>
                  </span>
                  {!readOnly && isAdmin && marked && useDeferredRemove && (
                    <button type="button" className="btn-quiet" onClick={() => opts?.onUndoDeferredRemove?.(a.id)}>
                      Undo
                    </button>
                  )}
                  {!readOnly && isAdmin && !marked && useDeferredRemove && (
                    <button type="button" className="btn-quiet danger" onClick={() => opts?.onDeferRemove?.(a.id)}>
                      Remove
                    </button>
                  )}
                  {!readOnly && isAdmin && !useDeferredRemove && (
                    <button
                      type="button"
                      className="btn-quiet danger"
                      onClick={() => removeAttachment(processId, a.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!readOnly && isAdmin && immediateUpload && (
          <div>
            <label className="label" htmlFor={`add-file-${processId}`}>Add another file</label>
            <input
              id={`add-file-${processId}`}
              type="file"
              className="input"
              style={{ paddingTop: '0.7rem' }}
              accept={FILE_INPUT_ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void uploadFile(processId, f);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderPendingFilesField = (
    pending: File[],
    setPending: Dispatch<SetStateAction<File[]>>,
    id: string
  ) => (
    <div className="stack-sm">
      <div>
        <label className="label" htmlFor={id}>
          Attach Excel / Word files (optional)
        </label>
        <input
          id={id}
          type="file"
          className="input"
          style={{ paddingTop: '0.7rem' }}
          multiple
          accept={FILE_INPUT_ACCEPT}
          onChange={(e) => {
            const next = Array.from(e.target.files || []);
            e.target.value = '';
            if (next.length) setPending((prev) => [...prev, ...next]);
          }}
        />
        <p className="hint">
          Choose one or more files, up to 4 MB each. They are saved when you submit this form.
        </p>
      </div>
      {pending.length > 0 && (
        <div className="list-group">
          {pending.map((f, i) => (
            <div key={`${f.name}-${i}-${f.size}`} className="list-row" style={{ cursor: 'default', minHeight: 56 }}>
              <span className="list-row-main" style={{ overflow: 'hidden' }}>
                <span className="list-row-title" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span className="list-row-meta">Will upload when you submit</span>
              </span>
              <button
                type="button"
                className="btn-quiet danger"
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const BackButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      type="button"
      className="back-link"
      onClick={onClick}
      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 6-6 6 6 6" />
      </svg>
      {label}
    </button>
  );

  const cancelEdit = () => {
    setEditId(null);
    setEditPendingFiles([]);
    setEditPendingRemoveIds([]);
    setScreen('list');
  };

  if (screen === 'menu') {
    return (
      <div className="page">
        <PageHeader
          back={ADMIN_BACK}
          title="Process documents"
          subtitle="Guides and forms for church activities. New processes and changes go to a second administrator for approval before they are published."
        />
        <div className="tile-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))' }}>
          <Reveal>
            <button
              type="button"
              className="feature-card"
              style={{ width: '100%', height: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }}
              onClick={() => setScreen('list')}
            >
              <span className="tile-icon" style={{ background: '#e7f1f3', color: '#3e7480' }}>
                <IconBook />
              </span>
              <span className="tile-title">View processes</span>
              <span className="tile-text">
                Open any process, download its files, and edit or delete it.
              </span>
              <span className="tile-more">
                Open <IconArrow size={20} />
              </span>
            </button>
          </Reveal>
          <Reveal delay={90}>
            <button
              type="button"
              className="feature-card"
              style={{ width: '100%', height: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }}
              onClick={() => {
                if (!isAdmin) {
                  alert('Only administrators can add a new process.');
                  return;
                }
                setAddPendingFiles([]);
                setScreen('add');
              }}
            >
              <span className="tile-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <IconNotice />
              </span>
              <span className="tile-title">Add process</span>
              <span className="tile-text">
                Write a new process and attach Excel or Word files on the same form.
                {roleChecked && !isAdmin ? ' (Administrators only.)' : ''}
              </span>
              <span className="tile-more">
                Start <IconArrow size={20} />
              </span>
            </button>
          </Reveal>
        </div>
      </div>
    );
  }

  if (screen === 'list') {
    return (
      <div className="page">
        <div>
          <BackButton label="Process documents" onClick={() => setScreen('menu')} />
          <PageHeader
            title="View processes"
            subtitle="Tap a process to read it. Edits and deletions need approval from a second administrator."
            actions={
              isAdmin ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAddPendingFiles([]);
                    setScreen('add');
                  }}
                >
                  Add process
                </button>
              ) : undefined
            }
          />
        </div>
        {isLoading ? (
          <SkeletonList rows={4} />
        ) : list.length === 0 ? (
          <EmptyState icon={<IconBook />} title="No process documents yet" text="Use “Add process” to create one." />
        ) : (
          <div className="list-group">
            {list.map((p) => (
              <div key={p.id} className="list-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => openDetail(p)}
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
                  <span className="list-row-main">
                    <span className="list-row-title">{p.title}</span>
                    <span className="list-row-meta" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', marginTop: '0.35rem' }}>
                      <span className={`badge ${p.audience === 'steward' ? 'badge-blue' : ''}`}>
                        {p.audience === 'steward' ? 'Steward' : 'Public'}
                      </span>
                      <StatusBadge status={p.status} />
                      <span>
                        Version {p.version} · {p.attachments.length} file{p.attachments.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                  </span>
                  <RowChevron />
                </button>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button type="button" className="btn-quiet" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button type="button" className="btn-quiet danger" onClick={() => requestDelete(p)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (screen === 'add') {
    return (
      <div className="page panel-enter" style={{ maxWidth: '52rem' }}>
        <div>
          <BackButton label="Process documents" onClick={() => setScreen('menu')} />
          <PageHeader
            title="Add process"
            subtitle="When you submit, a second administrator must approve it before it is published."
          />
        </div>
        <form onSubmit={submitAdd} className="card form-grid">
          <div>
            <label className="label" htmlFor="add-process-title">Title</label>
            <input
              id="add-process-title"
              className="input"
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              required
              disabled={!isAdmin}
            />
          </div>
          {isAdmin && (
            <AudienceRadios
              name="add-process-audience"
              value={addForm.audience}
              onChange={(audience) => setAddForm({ ...addForm, audience })}
            />
          )}
          <div>
            <label className="label">Content</label>
            <RichTextEditor
              value={addForm.contentHtml}
              onChange={(value) => setAddForm({ ...addForm, contentHtml: value })}
              placeholder="Enter process content…"
            />
          </div>
          {isAdmin && renderPendingFilesField(addPendingFiles, setAddPendingFiles, 'add-process-files')}
          {!isAdmin && <Alert tone="warning">Only administrators can create new processes.</Alert>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn" type="submit" disabled={addSubmitting || !isAdmin}>
              {addSubmitting ? 'Submitting…' : 'Submit for approval'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setScreen('menu')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (screen === 'edit' && editId != null) {
    const row = list.find((x) => x.id === editId) ?? null;
    return (
      <div className="page panel-enter" style={{ maxWidth: '52rem' }}>
        <div>
          <BackButton label="All processes" onClick={cancelEdit} />
          <PageHeader
            title="Edit process"
            subtitle="Your changes go live only after a second administrator approves them."
          />
        </div>
        <form onSubmit={submitEdit} className="card form-grid">
          <div>
            <label className="label" htmlFor="edit-process-title">Title</label>
            <input
              id="edit-process-title"
              className="input"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
          </div>
          <AudienceRadios
            name="edit-process-audience"
            value={editForm.audience}
            onChange={(audience) => setEditForm({ ...editForm, audience })}
          />
          <div>
            <label className="label">Content</label>
            <RichTextEditor
              value={editForm.contentHtml}
              onChange={(value) => setEditForm({ ...editForm, contentHtml: value })}
              placeholder="Enter process content…"
            />
          </div>
          {row ? (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }} className="stack">
              {renderAttachments(editId, row.attachments, !isAdmin, {
                immediateUpload: false,
                deferredRemovePendingIds: editPendingRemoveIds,
                onDeferRemove: (attId) =>
                  setEditPendingRemoveIds((prev) => (prev.includes(attId) ? prev : [...prev, attId])),
                onUndoDeferredRemove: (attId) =>
                  setEditPendingRemoveIds((prev) => prev.filter((x) => x !== attId)),
              })}
              {isAdmin && renderPendingFilesField(editPendingFiles, setEditPendingFiles, 'edit-process-files')}
            </div>
          ) : (
            <SkeletonList rows={2} height={56} />
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn" type="submit" disabled={editSubmitting}>
              {editSubmitting ? 'Submitting…' : 'Submit update for approval'}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (screen === 'detail' && selected) {
    const p = list.find((x) => x.id === selected.id) ?? selected;
    return (
      <div className="page panel-enter" style={{ maxWidth: '58rem' }}>
        <div>
          <BackButton label="All processes" onClick={() => setScreen('list')} />
          <PageHeader
            title={p.title}
            subtitle={
              <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem' }}>
                <span className={`badge ${p.audience === 'steward' ? 'badge-blue' : ''}`}>
                  {p.audience === 'steward' ? 'Steward' : 'Public'}
                </span>
                <StatusBadge status={p.status} />
                <span>Version {p.version} · Updated {longDate(p.updatedAt)}</span>
              </span>
            }
            actions={
              isAdmin ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-delete" onClick={() => requestDelete(p)}>
                    Delete
                  </button>
                </>
              ) : undefined
            }
          />
        </div>
        <article className="card notice-content" dangerouslySetInnerHTML={{ __html: p.contentHtml }} />
        <section className="card">
          {renderAttachments(p.id, p.attachments, true)}
          {isAdmin && (
            <p className="hint" style={{ marginTop: '1rem' }}>
              To add or remove files, choose <strong>Edit</strong>.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '32rem' }}>
      <p style={{ color: 'var(--text-2)', margin: 0 }}>Select an option to continue.</p>
      <button type="button" className="btn-secondary" style={{ width: 'fit-content' }} onClick={() => setScreen('menu')}>
        Main menu
      </button>
    </div>
  );
}
