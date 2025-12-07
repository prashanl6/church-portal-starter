'use client';
import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/RichTextEditor';

interface Process {
  id: number;
  title: string;
  contentHtml: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', contentHtml: '' });

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const res = await fetch('/api/processes');
        const data = await res.json();
        setProcesses(data.list || []);
      } catch (error) {
        console.error('Failed to fetch processes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.role === 'admin');
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };
    
    fetchProcesses();
    checkAdmin();
  }, []);

  const handleDelete = async (processId: number, processTitle: string) => {
    if (!window.confirm(`Are you sure you want to request deletion of process "${processTitle}"? This will require approval before the process is deleted.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/processes/${processId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Delete request submitted for approval');
        // Refresh processes list
        const processesRes = await fetch('/api/processes');
        const processesData = await processesRes.json();
        setProcesses(processesData.list || []);
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
    setEditForm({ title: process.title, contentHtml: process.contentHtml });
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
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        alert('Update request submitted for approval');
        setEditForm({ title: '', contentHtml: '' });
        setEditingId(null);
        // Refresh processes list
        const processesRes = await fetch('/api/processes');
        const processesData = await processesRes.json();
        setProcesses(processesData.list || []);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to submit update request' }));
        alert(errorData.error || 'Failed to submit update request');
      }
    } catch (error) {
      alert('Failed to submit update request');
    }
  };

  const cancelEdit = () => {
    setEditForm({ title: '', contentHtml: '' });
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
            <div>
              <label className="label">Content</label>
              <RichTextEditor
                value={editForm.contentHtml}
                onChange={(value) => setEditForm({ ...editForm, contentHtml: value })}
                placeholder="Enter process document content. Use the toolbar to format text with bold, italic, underline, colors, and more..."
              />
            </div>
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
                  className="btn"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgb(239, 68, 68)', color: 'white' }}
                >
                  Delete
                </button>
              </div>
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
            View and manage church process documents
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
                      marginBottom: '0.25rem'
                    }}>
                      {process.title}
                    </h2>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'rgb(100, 116, 139)',
                      margin: 0
                    }}>
                      Version {process.version} · Updated {new Date(process.updatedAt).toLocaleDateString()}
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
                      className="btn"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgb(239, 68, 68)', color: 'white' }}
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

