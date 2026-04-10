'use client';
import useSWR, { useSWRConfig } from 'swr';
import { useEffect, useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Active-only select list may omit partners on inactive anniversaries; merge so dropdowns stay valid. */
function selectOptionsWithIndividuals(
  base: { id: number; displayName: string }[],
  ...extra: ({ id: number; displayName: string } | undefined | null)[]
): { id: number; displayName: string }[] {
  const m = new Map(base.map((o) => [o.id, o]));
  for (const x of extra) {
    if (x && !m.has(x.id)) m.set(x.id, { id: x.id, displayName: x.displayName });
  }
  return [...m.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

type MainTab = 'upcoming' | 'birthday' | 'anniversary' | 'deactivated';

const NEXT_DAYS = 10;
const DEACTIVATED_PAGE_SIZE = 25;

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const x = new Date(iso);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const d = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function PeopleEventsPage() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const [tab, setTab] = useState<MainTab>('upcoming');
  const [expandedIndividualId, setExpandedIndividualId] = useState<number | null>(null);
  const [deathDateDraft, setDeathDateDraft] = useState<Record<number, string>>({});

  const [expandedAnniversaryId, setExpandedAnniversaryId] = useState<number | null>(null);
  const [anniversaryDraft, setAnniversaryDraft] = useState<{
    anniversaryDate: string;
    notes: string;
    individualAId: string;
    individualBId: string;
  } | null>(null);

  const [birthdayApplied, setBirthdayApplied] = useState<{ from: string; to: string } | null>(null);
  const [birthdayFromInput, setBirthdayFromInput] = useState('');
  const [birthdayToInput, setBirthdayToInput] = useState('');
  const [anniversaryApplied, setAnniversaryApplied] = useState<{ from: string; to: string } | null>(null);
  const [anniversaryFromInput, setAnniversaryFromInput] = useState('');
  const [anniversaryToInput, setAnniversaryToInput] = useState('');
  const [deactivatedPage, setDeactivatedPage] = useState(1);
  const [deactivatedAnnPage, setDeactivatedAnnPage] = useState(1);

  useEffect(() => {
    setExpandedIndividualId(null);
    setExpandedAnniversaryId(null);
    setBirthdayApplied(null);
    setAnniversaryApplied(null);
    setDeactivatedPage(1);
    setDeactivatedAnnPage(1);
  }, [tab]);

  const upcomingIndividualsKey = `/api/admin/individuals?nextDays=${NEXT_DAYS}`;
  const upcomingAnniversariesKey = `/api/admin/anniversaries?nextDays=${NEXT_DAYS}`;

  const individualsListKey =
    tab === 'birthday' && birthdayApplied
      ? `/api/admin/individuals?fromDate=${encodeURIComponent(birthdayApplied.from)}&toDate=${encodeURIComponent(birthdayApplied.to)}`
      : null;

  const anniversariesListKey =
    tab === 'anniversary' && anniversaryApplied
      ? `/api/admin/anniversaries?fromDate=${encodeURIComponent(anniversaryApplied.from)}&toDate=${encodeURIComponent(anniversaryApplied.to)}`
      : null;

  const deactivatedListKey =
    tab === 'deactivated'
      ? `/api/admin/individuals?status=inactive&page=${deactivatedPage}&pageSize=${DEACTIVATED_PAGE_SIZE}`
      : null;

  const deactivatedAnnListKey =
    tab === 'deactivated'
      ? `/api/admin/anniversaries?status=inactive&page=${deactivatedAnnPage}&pageSize=${DEACTIVATED_PAGE_SIZE}`
      : null;

  const { data: upcomingIndData, mutate: mutateUpcomingInd } = useSWR(upcomingIndividualsKey, fetcher);
  const { data: upcomingAnnData, mutate: mutateUpcomingAnn } = useSWR(upcomingAnniversariesKey, fetcher);

  const { data: indListData, mutate: mutateIndList } = useSWR(individualsListKey, fetcher);
  const { data: annListData, mutate: mutateAnnList } = useSWR(anniversariesListKey, fetcher);
  const { data: deactivatedListData, mutate: mutateDeactivatedList } = useSWR(deactivatedListKey, fetcher);
  const { data: deactivatedAnnListData, mutate: mutateDeactivatedAnnList } = useSWR(
    deactivatedAnnListKey,
    fetcher
  );

  const { data: selectData, mutate: mutateSelect } = useSWR('/api/admin/individuals?forSelect=1', fetcher);

  const bumpUpcoming = () =>
    Promise.all([
      mutateGlobal(`/api/admin/individuals?nextDays=${NEXT_DAYS}`),
      mutateGlobal(`/api/admin/anniversaries?nextDays=${NEXT_DAYS}`)
    ]);

  const refreshBirthdays = () =>
    Promise.all([mutateIndList(), mutateDeactivatedList(), mutateSelect(), bumpUpcoming()]);

  const refreshAnniversaries = () =>
    Promise.all([
      mutateAnnList(),
      mutateDeactivatedList(),
      mutateDeactivatedAnnList(),
      mutateSelect(),
      bumpUpcoming()
    ]);

  const refreshUpcoming = () => Promise.all([mutateUpcomingInd(), mutateUpcomingAnn(), bumpUpcoming()]);

  const [birthdayForm, setBirthdayForm] = useState({
    displayName: '',
    birthDate: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [anniversaryForm, setAnniversaryForm] = useState({
    individualAId: '',
    individualBId: '',
    anniversaryDate: '',
    notes: ''
  });

  const submitBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/individuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: birthdayForm.displayName,
        birthDate: new Date(birthdayForm.birthDate).toISOString(),
        email: birthdayForm.email || null,
        phone: birthdayForm.phone || null,
        notes: birthdayForm.notes || null
      })
    });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Individual added');
      setBirthdayForm({ displayName: '', birthDate: '', email: '', phone: '', notes: '' });
      await refreshBirthdays();
    } else {
      alert((await res.text()) || 'Failed to create');
    }
  };

  const submitAnniversary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (anniversaryForm.individualAId === anniversaryForm.individualBId) {
      alert('Choose two different individuals');
      return;
    }
    const res = await fetch('/api/admin/anniversaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        individualAId: Number(anniversaryForm.individualAId),
        individualBId: Number(anniversaryForm.individualBId),
        anniversaryDate: new Date(anniversaryForm.anniversaryDate).toISOString(),
        notes: anniversaryForm.notes || null
      })
    });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Anniversary added');
      setAnniversaryForm({ individualAId: '', individualBId: '', anniversaryDate: '', notes: '' });
      await refreshAnniversaries();
    } else {
      alert((await res.text()) || 'Failed to create');
    }
  };

  const toggleIndividualStatus = async (id: number, currentStatus: string) => {
    const res = await fetch(`/api/admin/individuals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
    });
    if (res.ok) await refreshBirthdays();
    else alert('Failed to update status');
  };

  const toggleAnniversaryStatus = async (id: number, currentStatus: string) => {
    const res = await fetch(`/api/admin/anniversaries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
    });
    if (res.ok) await refreshAnniversaries();
    else alert('Failed to update status');
  };

  const saveDateOfDeath = async (id: number) => {
    const raw = deathDateDraft[id];
    const res = await fetch(`/api/admin/individuals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateOfDeath: raw ? new Date(raw).toISOString() : null
      })
    });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      setExpandedIndividualId(null);
      await refreshBirthdays();
    } else alert((await res.text()) || 'Failed to save');
  };

  const openIndividualDetails = (row: { id: number; dateOfDeath?: string | null }) => {
    setExpandedIndividualId(row.id);
    setDeathDateDraft((d) => ({ ...d, [row.id]: toDateInputValue(row.dateOfDeath ?? undefined) }));
  };

  const openAnniversaryDetails = (row: any) => {
    setExpandedAnniversaryId(row.id);
    setAnniversaryDraft({
      anniversaryDate: toDateInputValue(row.anniversaryDate),
      notes: row.notes || '',
      individualAId: String(row.individualA?.id ?? row.individualAId ?? ''),
      individualBId: String(row.individualB?.id ?? row.individualBId ?? '')
    });
  };

  const saveAnniversaryDetails = async (id: number) => {
    if (!anniversaryDraft) return;
    if (anniversaryDraft.individualAId === anniversaryDraft.individualBId) {
      alert('Choose two different individuals');
      return;
    }
    const res = await fetch(`/api/admin/anniversaries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anniversaryDate: new Date(anniversaryDraft.anniversaryDate).toISOString(),
        notes: anniversaryDraft.notes || null,
        individualAId: Number(anniversaryDraft.individualAId),
        individualBId: Number(anniversaryDraft.individualBId)
      })
    });
    if (res.ok) {
      setExpandedAnniversaryId(null);
      setAnniversaryDraft(null);
      await refreshAnniversaries();
    } else alert((await res.text()) || 'Failed to save');
  };

  const loadBirthdayRange = () => {
    if (!birthdayFromInput.trim() || !birthdayToInput.trim()) {
      alert('Enter both from and to dates.');
      return;
    }
    if (birthdayFromInput > birthdayToInput) {
      alert('From date must be on or before to date.');
      return;
    }
    setBirthdayApplied({ from: birthdayFromInput, to: birthdayToInput });
  };

  const loadAnniversaryRange = () => {
    if (!anniversaryFromInput.trim() || !anniversaryToInput.trim()) {
      alert('Enter both from and to dates.');
      return;
    }
    if (anniversaryFromInput > anniversaryToInput) {
      alert('From date must be on or before to date.');
      return;
    }
    setAnniversaryApplied({ from: anniversaryFromInput, to: anniversaryToInput });
  };

  const birthdayTotal = indListData?.total ?? 0;
  const birthdayList = indListData?.list ?? [];
  const anniversaryTotal = annListData?.total ?? 0;
  const anniversaryList = annListData?.list ?? [];
  const deactivatedTotal = deactivatedListData?.total ?? 0;
  const deactivatedList = deactivatedListData?.list ?? [];
  const deactivatedTotalPages = Math.max(1, Math.ceil(deactivatedTotal / DEACTIVATED_PAGE_SIZE));

  const deactivatedAnnTotal = deactivatedAnnListData?.total ?? 0;
  const deactivatedAnnList = deactivatedAnnListData?.list ?? [];
  const deactivatedAnnTotalPages = Math.max(1, Math.ceil(deactivatedAnnTotal / DEACTIVATED_PAGE_SIZE));

  const selectOptions: { id: number; displayName: string }[] = selectData?.list ?? [];

  const upcomingIndList = upcomingIndData?.list ?? [];
  const upcomingAnnList = upcomingAnnData?.list ?? [];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Birthdays &amp; Anniversaries</h1>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Section">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'upcoming' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
          onClick={() => setTab('upcoming')}
        >
          Next {NEXT_DAYS} days
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'birthday'}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'birthday' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
          onClick={() => setTab('birthday')}
        >
          Birthdays
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'anniversary'}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'anniversary' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
          onClick={() => setTab('anniversary')}
        >
          Anniversaries
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'deactivated'}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'deactivated' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
          onClick={() => setTab('deactivated')}
        >
          Deactivated
        </button>
      </div>

      {tab === 'upcoming' && (
        <div className="grid gap-6">
          <p className="text-sm text-gray-600">
            Birthdays in the next {NEXT_DAYS} calendar days for <strong>active</strong> individuals with a date of
            birth (deceased excluded). Anniversaries in the same window where the record and <strong>both</strong>{' '}
            partners are active (deceased excluded).
          </p>
          <div>
            <h2 className="text-lg font-semibold mb-3">Birthdays</h2>
            {upcomingIndList.length === 0 ? (
              <p className="text-gray-500">None in this window.</p>
            ) : (
              <div className="grid gap-2">
                {upcomingIndList.map((e: any) => (
                  <div key={e.id} className="card">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {'\u{1F382}'} {e.displayName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {e.birthDate
                            ? new Date(e.birthDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'No date of birth'}
                          {e.email && ` · ${e.email}`}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3">Anniversaries</h2>
            {upcomingAnnList.length === 0 ? (
              <p className="text-gray-500">None in this window.</p>
            ) : (
              <div className="grid gap-2">
                {upcomingAnnList.map((e: any) => (
                  <div key={e.id} className="card">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {'\u{1F492}'} {e.individualA?.displayName} &amp; {e.individualB?.displayName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(e.anniversaryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {e.notes && ` · ${e.notes}`}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn-secondary w-fit" onClick={() => refreshUpcoming()}>
            Refresh
          </button>
        </div>
      )}

      {tab === 'birthday' && (
        <>
          <div className="card grid gap-3">
            <p className="text-sm text-gray-600">
              Choose a date range. Results load only after you click Load. Only <strong>active</strong> individuals
              with no date of death are included (birthday month/day falls on any day in the range).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">From date</label>
                <input
                  className="input max-w-xs"
                  type="date"
                  value={birthdayFromInput}
                  onChange={(ev) => setBirthdayFromInput(ev.target.value)}
                />
              </div>
              <div>
                <label className="label">To date</label>
                <input
                  className="input max-w-xs"
                  type="date"
                  value={birthdayToInput}
                  onChange={(ev) => setBirthdayToInput(ev.target.value)}
                />
              </div>
              <button type="button" className="btn" onClick={loadBirthdayRange}>
                Load
              </button>
              {birthdayApplied && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setBirthdayApplied(null);
                  }}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Individuals</h2>
            {!birthdayApplied ? (
              <p className="text-gray-500">Enter from and to dates, then click Load to see results.</p>
            ) : birthdayTotal === 0 ? (
              <p className="text-gray-500">No matching birthdays in this range.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {birthdayTotal} result{birthdayTotal !== 1 ? 's' : ''} ·{' '}
                  {new Date(birthdayApplied.from + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}{' '}
                  –{' '}
                  {new Date(birthdayApplied.to + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <div className="grid gap-2">
                  {birthdayList.map((e: any) => (
                    <div key={e.id} className="card">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {'\u{1F382}'} {e.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {e.birthDate
                              ? new Date(e.birthDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'No date of birth'}
                            {e.email && ` · ${e.email}`}
                            {e.phone && ` · ${e.phone}`}
                          </div>
                          {e.dateOfDeath && (
                            <div className="text-sm text-gray-500 mt-1">
                              Date of death:{' '}
                              {new Date(e.dateOfDeath).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center shrink-0">
                          <span
                            className={`px-2 py-1 rounded text-sm text-center ${
                              e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {e.status}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => openIndividualDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => toggleIndividualStatus(e.id, e.status)}
                          >
                            {e.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                      {expandedIndividualId === e.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3">
                          <div>
                            <label className="label">Date of death (optional)</label>
                            <p className="text-xs text-gray-500 mb-2">
                              Saving a date of death deactivates this record automatically.
                            </p>
                            <input
                              className="input max-w-xs"
                              type="date"
                              value={deathDateDraft[e.id] ?? ''}
                              onChange={(ev) =>
                                setDeathDateDraft((d) => ({ ...d, [e.id]: ev.target.value }))
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn w-fit" onClick={() => saveDateOfDeath(e.id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-secondary w-fit"
                              onClick={() => setExpandedIndividualId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <form onSubmit={submitBirthday} className="card grid gap-3">
            <h2 className="text-lg font-semibold">Add individual (birthday)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={birthdayForm.displayName}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, displayName: ev.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input
                  className="input"
                  type="date"
                  value={birthdayForm.birthDate}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, birthDate: ev.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Email (optional)</label>
                <input
                  className="input"
                  type="email"
                  value={birthdayForm.email}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, email: ev.target.value })}
                />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input
                  className="input"
                  type="tel"
                  value={birthdayForm.phone}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, phone: ev.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input"
                value={birthdayForm.notes}
                onChange={(ev) => setBirthdayForm({ ...birthdayForm, notes: ev.target.value })}
                rows={3}
              />
            </div>
            <button className="btn w-fit">Add individual</button>
          </form>
        </>
      )}

      {tab === 'anniversary' && (
        <>
          <div className="card grid gap-3">
            <p className="text-sm text-gray-600">
              Choose a date range. Results load only after you click Load. Active anniversary records only, with{' '}
              <strong>both</strong> partners active and not deceased (anniversary month/day falls on any day in the
              range).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">From date</label>
                <input
                  className="input max-w-xs"
                  type="date"
                  value={anniversaryFromInput}
                  onChange={(ev) => setAnniversaryFromInput(ev.target.value)}
                />
              </div>
              <div>
                <label className="label">To date</label>
                <input
                  className="input max-w-xs"
                  type="date"
                  value={anniversaryToInput}
                  onChange={(ev) => setAnniversaryToInput(ev.target.value)}
                />
              </div>
              <button type="button" className="btn" onClick={loadAnniversaryRange}>
                Load
              </button>
              {anniversaryApplied && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setAnniversaryApplied(null);
                  }}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Anniversaries</h2>
            {!anniversaryApplied ? (
              <p className="text-gray-500">Enter from and to dates, then click Load to see results.</p>
            ) : anniversaryTotal === 0 ? (
              <p className="text-gray-500">No matching anniversaries in this range.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {anniversaryTotal} result{anniversaryTotal !== 1 ? 's' : ''} ·{' '}
                  {new Date(anniversaryApplied.from + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}{' '}
                  –{' '}
                  {new Date(anniversaryApplied.to + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <div className="grid gap-2">
                  {anniversaryList.map((e: any) => (
                    <div key={e.id} className="card">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {'\u{1F492}'} {e.individualA?.displayName} &amp; {e.individualB?.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(e.anniversaryDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center shrink-0">
                          <span
                            className={`px-2 py-1 rounded text-sm text-center ${
                              e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {e.status}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => openAnniversaryDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => toggleAnniversaryStatus(e.id, e.status)}
                          >
                            {e.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                      {expandedAnniversaryId === e.id && anniversaryDraft && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label">Person 1</label>
                              <select
                                className="input"
                                value={anniversaryDraft.individualAId}
                                onChange={(ev) =>
                                  setAnniversaryDraft({ ...anniversaryDraft, individualAId: ev.target.value })
                                }
                              >
                                {selectOptions.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="label">Person 2</label>
                              <select
                                className="input"
                                value={anniversaryDraft.individualBId}
                                onChange={(ev) =>
                                  setAnniversaryDraft({ ...anniversaryDraft, individualBId: ev.target.value })
                                }
                              >
                                {selectOptions.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="label">Anniversary date</label>
                            <input
                              className="input max-w-xs"
                              type="date"
                              value={anniversaryDraft.anniversaryDate}
                              onChange={(ev) =>
                                setAnniversaryDraft({ ...anniversaryDraft, anniversaryDate: ev.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="label">Notes</label>
                            <textarea
                              className="input"
                              rows={2}
                              value={anniversaryDraft.notes}
                              onChange={(ev) =>
                                setAnniversaryDraft({ ...anniversaryDraft, notes: ev.target.value })
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn w-fit" onClick={() => saveAnniversaryDetails(e.id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-secondary w-fit"
                              onClick={() => {
                                setExpandedAnniversaryId(null);
                                setAnniversaryDraft(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <form onSubmit={submitAnniversary} className="card grid gap-3">
            <h2 className="text-lg font-semibold">Add anniversary</h2>
            <p className="text-sm text-gray-600">
              Link two people already on file. Only anniversary date and notes are stored on this record.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Person 1</label>
                <select
                  className="input"
                  value={anniversaryForm.individualAId}
                  onChange={(ev) => setAnniversaryForm({ ...anniversaryForm, individualAId: ev.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {selectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Person 2</label>
                <select
                  className="input"
                  value={anniversaryForm.individualBId}
                  onChange={(ev) => setAnniversaryForm({ ...anniversaryForm, individualBId: ev.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {selectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Anniversary date</label>
              <input
                className="input max-w-xs"
                type="date"
                value={anniversaryForm.anniversaryDate}
                onChange={(ev) => setAnniversaryForm({ ...anniversaryForm, anniversaryDate: ev.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input"
                value={anniversaryForm.notes}
                onChange={(ev) => setAnniversaryForm({ ...anniversaryForm, notes: ev.target.value })}
                rows={2}
              />
            </div>
            <button className="btn w-fit">Add anniversary</button>
          </form>
        </>
      )}

      {tab === 'deactivated' && (
        <div className="grid gap-8">
          <p className="text-sm text-gray-600">
            Records with status <strong>inactive</strong>: people (manually deactivated or after a date of death was
            saved) and anniversary rows that were deactivated manually. Reactivate to return them to active lists where
            applicable.
          </p>

          <div>
            <h2 className="text-lg font-semibold mb-1">Individuals</h2>
            <p className="text-sm text-gray-600 mb-3">Inactive people on file (birthdays / directory).</p>
            {deactivatedTotal === 0 ? (
              <p className="text-gray-500">No deactivated individuals.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Showing {(deactivatedPage - 1) * DEACTIVATED_PAGE_SIZE + 1}–
                  {Math.min(deactivatedPage * DEACTIVATED_PAGE_SIZE, deactivatedTotal)} of {deactivatedTotal}
                </p>
                <div className="grid gap-2">
                  {deactivatedList.map((e: any) => (
                    <div key={e.id} className="card">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {'\u{1F382}'} {e.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {e.birthDate
                              ? new Date(e.birthDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'No date of birth'}
                            {e.email && ` · ${e.email}`}
                            {e.phone && ` · ${e.phone}`}
                          </div>
                          {e.dateOfDeath && (
                            <div className="text-sm text-gray-500 mt-1">
                              Date of death:{' '}
                              {new Date(e.dateOfDeath).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center shrink-0">
                          <span className="px-2 py-1 rounded text-sm text-center bg-gray-100 text-gray-800">
                            {e.status}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => openIndividualDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => toggleIndividualStatus(e.id, e.status)}
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                      {expandedIndividualId === e.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3">
                          <div>
                            <label className="label">Date of death (optional)</label>
                            <p className="text-xs text-gray-500 mb-2">
                              Clear this if it was set in error; saving empty does not auto-activate—you can use
                              Reactivate.
                            </p>
                            <input
                              className="input max-w-xs"
                              type="date"
                              value={deathDateDraft[e.id] ?? ''}
                              onChange={(ev) =>
                                setDeathDateDraft((d) => ({ ...d, [e.id]: ev.target.value }))
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn w-fit" onClick={() => saveDateOfDeath(e.id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-secondary w-fit"
                              onClick={() => setExpandedIndividualId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={deactivatedPage <= 1}
                    onClick={() => setDeactivatedPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={deactivatedPage >= deactivatedTotalPages}
                    onClick={() => setDeactivatedPage((p) => Math.min(deactivatedTotalPages, p + 1))}
                  >
                    Next
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {deactivatedPage} of {deactivatedTotalPages}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold mb-1">Anniversaries</h2>
            <p className="text-sm text-gray-600 mb-3">
              Anniversary records with status inactive (partners may still be active or inactive).
            </p>
            {deactivatedAnnTotal === 0 ? (
              <p className="text-gray-500">No deactivated anniversaries.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Showing {(deactivatedAnnPage - 1) * DEACTIVATED_PAGE_SIZE + 1}–
                  {Math.min(deactivatedAnnPage * DEACTIVATED_PAGE_SIZE, deactivatedAnnTotal)} of {deactivatedAnnTotal}
                </p>
                <div className="grid gap-2">
                  {deactivatedAnnList.map((e: any) => (
                    <div key={e.id} className="card">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {'\u{1F492}'} {e.individualA?.displayName} &amp; {e.individualB?.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(e.anniversaryDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          {(e.individualA?.dateOfDeath || e.individualB?.dateOfDeath) && (
                            <div className="text-sm text-amber-800 mt-1">
                              Partner note: one or both people have a date of death on file—review before reactivating.
                            </div>
                          )}
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center shrink-0">
                          <span className="px-2 py-1 rounded text-sm text-center bg-gray-100 text-gray-800">
                            {e.status}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => openAnniversaryDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => toggleAnniversaryStatus(e.id, e.status)}
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                      {expandedAnniversaryId === e.id && anniversaryDraft && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label">Person 1</label>
                              <select
                                className="input"
                                value={anniversaryDraft.individualAId}
                                onChange={(ev) =>
                                  setAnniversaryDraft({ ...anniversaryDraft, individualAId: ev.target.value })
                                }
                              >
                                {selectOptionsWithIndividuals(
                                  selectOptions,
                                  e.individualA,
                                  e.individualB
                                ).map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="label">Person 2</label>
                              <select
                                className="input"
                                value={anniversaryDraft.individualBId}
                                onChange={(ev) =>
                                  setAnniversaryDraft({ ...anniversaryDraft, individualBId: ev.target.value })
                                }
                              >
                                {selectOptionsWithIndividuals(
                                  selectOptions,
                                  e.individualA,
                                  e.individualB
                                ).map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="label">Anniversary date</label>
                            <input
                              className="input max-w-xs"
                              type="date"
                              value={anniversaryDraft.anniversaryDate}
                              onChange={(ev) =>
                                setAnniversaryDraft({ ...anniversaryDraft, anniversaryDate: ev.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="label">Notes</label>
                            <textarea
                              className="input"
                              rows={2}
                              value={anniversaryDraft.notes}
                              onChange={(ev) =>
                                setAnniversaryDraft({ ...anniversaryDraft, notes: ev.target.value })
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn w-fit" onClick={() => saveAnniversaryDetails(e.id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-secondary w-fit"
                              onClick={() => {
                                setExpandedAnniversaryId(null);
                                setAnniversaryDraft(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={deactivatedAnnPage <= 1}
                    onClick={() => setDeactivatedAnnPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={deactivatedAnnPage >= deactivatedAnnTotalPages}
                    onClick={() => setDeactivatedAnnPage((p) => Math.min(deactivatedAnnTotalPages, p + 1))}
                  >
                    Next
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {deactivatedAnnPage} of {deactivatedAnnTotalPages}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
