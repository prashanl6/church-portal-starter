'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import RichTextEditor from '@/components/RichTextEditor';
import type { ProcessAudience } from '@/lib/processAudience';

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
    <fieldset className="grid gap-2">
      <legend className="label mb-0">Tag (required)</legend>
      <p className="text-xs text-gray-600">
        <strong>Public</strong> — listed for everyone, including without a login. <strong>Steward</strong> — listed only
        for users who are logged in.
      </p>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name={name}
          value="public"
          checked={value === 'public'}
          onChange={() => onChange('public')}
          disabled={disabled}
        />
        Public
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name={name}
          value="steward"
          checked={value === 'steward'}
          onChange={() => onChange('steward')}
          disabled={disabled}
        />
        Steward
      </label>
    </fieldset>
  );
}

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
      <div className="grid gap-2 mt-4">
        <h3 className="text-sm font-semibold text-slate-800">Attached documents (Excel / Word)</h3>
        <p className="text-xs text-gray-600">
          .xls, .xlsx, .doc, .docx — up to 25MB each. Files open in a new tab when downloaded.
        </p>
        {useDeferredRemove && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            Removing a file here takes effect only after this update is <strong>approved</strong>. Until then it stays on
            the live process.
          </p>
        )}
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-500">No files attached yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {attachments.map((a) => {
              const marked = deferPending.includes(a.id);
              return (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded border border-slate-200 ${
                    marked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'
                  }`}
                >
                  <a
                    href={a.storedPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 hover:underline font-medium ${marked ? 'line-through opacity-80' : ''}`}
                  >
                    {a.fileName}
                  </a>
                  <span className="text-xs text-gray-500">{formatBytes(a.byteSize)}</span>
                  {!readOnly && isAdmin && marked && useDeferredRemove && (
                    <>
                      <span className="text-xs text-amber-800">Pending removal</span>
                      <button
                        type="button"
                        className="text-xs text-blue-700 hover:underline"
                        onClick={() => opts?.onUndoDeferredRemove?.(a.id)}
                      >
                        Undo
                      </button>
                    </>
                  )}
                  {!readOnly && isAdmin && !marked && useDeferredRemove && (
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:underline"
                      onClick={() => opts?.onDeferRemove?.(a.id)}
                    >
                      Remove
                    </button>
                  )}
                  {!readOnly && isAdmin && !useDeferredRemove && (
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:underline"
                      onClick={() => removeAttachment(processId, a.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!readOnly && isAdmin && immediateUpload && (
          <div>
            <label className="label">Add another file</label>
            <input
              type="file"
              className="text-sm"
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
    <div className="grid gap-2">
      <label className="label" htmlFor={id}>
        Attach Excel / Word files (optional)
      </label>
      <p className="text-xs text-gray-600">
        Select one or more files. They are saved when you submit this form (same step as the process).
      </p>
      <input
        id={id}
        type="file"
        className="text-sm"
        multiple
        accept={FILE_INPUT_ACCEPT}
        onChange={(e) => {
          const next = Array.from(e.target.files || []);
          e.target.value = '';
          if (next.length) setPending((prev) => [...prev, ...next]);
        }}
      />
      {pending.length > 0 && (
        <ul className="text-sm space-y-1 border border-slate-200 rounded-md p-2 bg-slate-50">
          {pending.map((f, i) => (
            <li key={`${f.name}-${i}-${f.size}`} className="flex justify-between gap-2 items-center">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="text-xs text-red-700 shrink-0 hover:underline"
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (screen === 'menu') {
    return (
      <div className="grid gap-6 max-w-2xl">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-semibold">Process documents</h1>
          <Link href="/admin" className="btn-secondary">
            Back to admin
          </Link>
        </div>
        <p className="text-sm text-gray-600">
          Manage church process documents: view and edit existing processes, or add a new one. Attach Excel or Word
          files to any process for download.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="card text-left hover:border-blue-300 transition-colors border-2 border-transparent"
            onClick={() => setScreen('list')}
          >
            <div className="text-lg font-semibold text-slate-900">1. View processes</div>
            <p className="text-sm text-gray-600 mt-2">
              Browse all processes, open the full document, download attachments, and edit (admin) from here.
            </p>
          </button>
          <button
            type="button"
            className="card text-left hover:border-blue-300 transition-colors border-2 border-transparent"
            onClick={() => {
              if (!isAdmin) {
                alert('Only administrators can add a new process.');
                return;
              }
              setAddPendingFiles([]);
              setScreen('add');
            }}
          >
            <div className="text-lg font-semibold text-slate-900">2. Add process</div>
            <p className="text-sm text-gray-600 mt-2">
              Create a new process document and attach Excel/Word files on the same form before you submit.
              {roleChecked && !isAdmin ? ' (Administrators only.)' : ''}
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'list') {
    return (
      <div className="grid gap-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setScreen('menu')}>
            ← Main menu
          </button>
          <h1 className="text-2xl font-semibold">View processes</h1>
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : list.length === 0 ? (
          <div className="card text-gray-600 text-sm">No process documents yet. Use “Add process” to create one.</div>
        ) : (
          <div className="grid gap-3">
            {list.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-start justify-between gap-3">
                <button type="button" className="text-left flex-1 min-w-[200px]" onClick={() => openDetail(p)}>
                  <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                    {p.title}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        p.audience === 'steward' ? 'bg-violet-100 text-violet-900' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.audience === 'steward' ? 'Steward' : 'Public'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    v{p.version} · {p.status.replace(/_/g, ' ')} · {p.attachments.length} file
                    {p.attachments.length !== 1 ? 's' : ''}
                  </div>
                </button>
                <div className="flex gap-2">
                  {isAdmin && (
                    <>
                      <button type="button" className="btn-secondary text-sm" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button type="button" className="btn-delete text-sm" onClick={() => requestDelete(p)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (screen === 'add') {
    return (
      <div className="grid gap-4 max-w-3xl">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setScreen('menu')}>
            ← Main menu
          </button>
          <h1 className="text-2xl font-semibold">Add process</h1>
        </div>
        <form onSubmit={submitAdd} className="card grid gap-4">
          <div>
            <label className="label">Title</label>
            <input
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
          {!isAdmin && <p className="text-sm text-amber-800">Only administrators can create new processes.</p>}
          <button className="btn w-fit" type="submit" disabled={addSubmitting || !isAdmin}>
            {addSubmitting ? 'Submitting…' : 'Submit for approval'}
          </button>
        </form>
      </div>
    );
  }

  if (screen === 'edit' && editId != null) {
    const row = list.find((x) => x.id === editId) ?? null;
    return (
      <div className="grid gap-4 max-w-3xl">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setEditId(null);
              setEditPendingFiles([]);
              setEditPendingRemoveIds([]);
              setScreen('list');
            }}
          >
            ← Back to list
          </button>
          <h1 className="text-2xl font-semibold">Edit process</h1>
        </div>
        <form onSubmit={submitEdit} className="card grid gap-4">
          <div>
            <label className="label">Title</label>
            <input
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
            <>
              {renderAttachments(editId, row.attachments, !isAdmin, {
                immediateUpload: false,
                deferredRemovePendingIds: editPendingRemoveIds,
                onDeferRemove: (attId) =>
                  setEditPendingRemoveIds((prev) => (prev.includes(attId) ? prev : [...prev, attId])),
                onUndoDeferredRemove: (attId) =>
                  setEditPendingRemoveIds((prev) => prev.filter((x) => x !== attId)),
              })}
              {isAdmin && renderPendingFilesField(editPendingFiles, setEditPendingFiles, 'edit-process-files')}
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading files…</p>
          )}
          <div className="flex gap-2">
            <button className="btn w-fit" type="submit" disabled={editSubmitting}>
              {editSubmitting ? 'Submitting…' : 'Submit update for approval'}
            </button>
            <button
              type="button"
              className="btn-secondary w-fit"
              onClick={() => {
                setEditId(null);
                setEditPendingFiles([]);
                setEditPendingRemoveIds([]);
                setScreen('list');
              }}
            >
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
      <div className="grid gap-4 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn-secondary" onClick={() => setScreen('list')}>
            ← Back to list
          </button>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button type="button" className="btn-secondary" onClick={() => startEdit(p)}>
                  Edit
                </button>
                <button type="button" className="btn-delete" onClick={() => requestDelete(p)}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        <div className="card grid gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{p.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tag: <strong className="text-slate-700">{p.audience === 'steward' ? 'Steward' : 'Public'}</strong> ·
              Version {p.version} · {p.status.replace(/_/g, ' ')} · Updated{' '}
              {new Date(p.updatedAt).toLocaleString()}
            </p>
          </div>
          {renderAttachments(p.id, p.attachments, true)}
          {isAdmin && (
            <p className="text-xs text-gray-500 mt-2">
              To add or remove files, click <strong>Edit</strong>.
            </p>
          )}
          <article
            className="notice-content prose max-w-none border-t border-slate-200 pt-4 mt-2"
            dangerouslySetInnerHTML={{ __html: p.contentHtml }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 max-w-lg">
      <p className="text-sm text-gray-600">Select an option to continue.</p>
      <button type="button" className="btn-secondary w-fit" onClick={() => setScreen('menu')}>
        Main menu
      </button>
    </div>
  );
}
