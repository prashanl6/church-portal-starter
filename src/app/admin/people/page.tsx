'use client';
import { tell } from '@/components/Dialog';
import useSWR, { useSWRConfig } from 'swr';
import { PageHeader, ADMIN_BACK, StatusBadge, DateChip, RowChevron, longDate } from '@/components/ui';
import { useEffect, useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Show the server's plain-English message (or a fallback) after a save. */
async function showResult(res: Response, fallbackOk: string, fallbackErr: string): Promise<boolean> {
  const body = await res.json().catch(() => ({} as any));
  if (res.status === 401) {
    tell('Your session has expired. Please log in again.').then(() => { window.location.href = '/login'; });
    return false;
  }
  tell(res.ok ? body.message || fallbackOk : body.error || fallbackErr);
  return res.ok;
}

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
    if (await showResult(res, 'Sent for approval.', 'Could not save.')) {
      setBirthdayForm({ displayName: '', birthDate: '', email: '', phone: '', notes: '' });
      await refreshBirthdays();
    }
  };

  const submitAnniversary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (anniversaryForm.individualAId === anniversaryForm.individualBId) {
      tell('Choose two different individuals');
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
    if (await showResult(res, 'Sent for approval.', 'Could not save.')) {
      setAnniversaryForm({ individualAId: '', individualBId: '', anniversaryDate: '', notes: '' });
      await refreshAnniversaries();
    }
  };

  const toggleIndividualStatus = async (id: number, currentStatus: string) => {
    const res = await fetch(`/api/admin/individuals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
    });
    if (await showResult(res, 'Sent for approval.', 'Could not change the status.')) await refreshBirthdays();
  };

  const toggleAnniversaryStatus = async (id: number, currentStatus: string) => {
    const res = await fetch(`/api/admin/anniversaries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
    });
    if (await showResult(res, 'Sent for approval.', 'Could not change the status.')) await refreshAnniversaries();
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
    if (await showResult(res, 'Sent for approval.', 'Could not save.')) {
      setExpandedIndividualId(null);
      await refreshBirthdays();
    }
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
      tell('Choose two different individuals');
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
    if (await showResult(res, 'Sent for approval.', 'Could not save.')) {
      setExpandedAnniversaryId(null);
      setAnniversaryDraft(null);
      await refreshAnniversaries();
    }
  };

  const loadBirthdayRange = () => {
    if (!birthdayFromInput.trim() || !birthdayToInput.trim()) {
      tell('Enter both from and to dates.');
      return;
    }
    if (birthdayFromInput > birthdayToInput) {
      tell('From date must be on or before to date.');
      return;
    }
    setBirthdayApplied({ from: birthdayFromInput, to: birthdayToInput });
  };

  const loadAnniversaryRange = () => {
    if (!anniversaryFromInput.trim() || !anniversaryToInput.trim()) {
      tell('Enter both from and to dates.');
      return;
    }
    if (anniversaryFromInput > anniversaryToInput) {
      tell('From date must be on or before to date.');
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
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        eyebrow="People"
        title="Birthdays &amp; Anniversaries"
        subtitle="New people, anniversaries and changes go to a second administrator for approval before they are saved."
      />

      <div className="segmented" role="tablist" aria-label="Section" style={{ justifySelf: 'start' }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          className={tab === 'upcoming' ? 'is-active' : ''}
          onClick={() => setTab('upcoming')}
        >
          Next {NEXT_DAYS} days
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'birthday'}
          className={tab === 'birthday' ? 'is-active' : ''}
          onClick={() => setTab('birthday')}
        >
          Birthdays
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'anniversary'}
          className={tab === 'anniversary' ? 'is-active' : ''}
          onClick={() => setTab('anniversary')}
        >
          Anniversaries
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'deactivated'}
          className={tab === 'deactivated' ? 'is-active' : ''}
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
            <h2 className="section-label">Birthdays</h2>
            {upcomingIndList.length === 0 ? (
              <p className="text-gray-500">None in this window.</p>
            ) : (
              <div className="list-group">
                {upcomingIndList.map((e: any) => (
                  <div key={e.id} className="list-row" style={{ cursor: 'default' }}>
                    {e.birthDate && <DateChip date={e.birthDate} />}
                    <span className="list-row-main">
                      <span className="list-row-title">{e.displayName}</span>
                      <span className="list-row-meta">
                        {e.birthDate ? `Born ${longDate(e.birthDate)}` : 'No date of birth'}
                        {e.email && ` · ${e.email}`}
                      </span>
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="section-label">Anniversaries</h2>
            {upcomingAnnList.length === 0 ? (
              <p className="text-gray-500">None in this window.</p>
            ) : (
              <div className="list-group">
                {upcomingAnnList.map((e: any) => (
                  <div key={e.id} className="list-row" style={{ cursor: 'default' }}>
                    <DateChip date={e.anniversaryDate} />
                    <span className="list-row-main">
                      <span className="list-row-title">
                        {e.individualA?.displayName} &amp; {e.individualB?.displayName}
                      </span>
                      <span className="list-row-meta">
                        Married {longDate(e.anniversaryDate)}
                        {e.notes && ` · ${e.notes}`}
                      </span>
                    </span>
                    <StatusBadge status={e.status} />
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
          <div className="card form-grid">
            <p className="text-sm text-gray-600">
              Choose a date range. Results load only after you click Load. Only <strong>active</strong> individuals
              with no date of death are included (birthday month/day falls on any day in the range).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="people-field-1">From date</label>
                <input id="people-field-1"
                  className="input max-w-xs"
                  type="date"
                  value={birthdayFromInput}
                  onChange={(ev) => setBirthdayFromInput(ev.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="people-field-2">To date</label>
                <input id="people-field-2"
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
            <h2 className="section-label">Individuals</h2>
            {!birthdayApplied ? (
              <p className="text-gray-500">Enter from and to dates, then click Load to see results.</p>
            ) : birthdayTotal === 0 ? (
              <p className="text-gray-500">No matching birthdays in this range.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {birthdayTotal} result{birthdayTotal !== 1 ? 's' : ''} ·{' '}
                  {new Date(birthdayApplied.from + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                  –{' '}
                  {new Date(birthdayApplied.to + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="grid gap-2">
                  {birthdayList.map((e: any) => (
                    <div key={e.id} className="card">
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {e.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {e.birthDate
                              ? longDate(e.birthDate)
                              : 'No date of birth'}
                            {e.email && ` · ${e.email}`}
                            {e.phone && ` · ${e.phone}`}
                          </div>
                          {e.dateOfDeath && (
                            <div className="text-sm text-gray-500 mt-1">
                              Date of death:{' '}
                              {longDate(e.dateOfDeath)}
                            </div>
                          )}
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center shrink-0">
                          <StatusBadge status={e.status} />
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => openIndividualDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => toggleIndividualStatus(e.id, e.status)}
                          >
                            {e.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                      {expandedIndividualId === e.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3 panel-enter">
                          <div>
                            <label className="label" htmlFor="people-field-3">Date of death (optional)</label>
                            <p className="text-xs text-gray-500 mb-2">
                              Saving a date of death deactivates this record automatically.
                            </p>
                            <input id="people-field-3"
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

          <form onSubmit={submitBirthday} className="card form-grid">
            <h2 className="section-label">Add individual (birthday)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="people-field-4">Name</label>
                <input id="people-field-4"
                  className="input"
                  value={birthdayForm.displayName}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, displayName: ev.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="people-field-5">Date of birth</label>
                <input id="people-field-5"
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
                <label className="label" htmlFor="people-field-6">Email (optional)</label>
                <input id="people-field-6"
                  className="input"
                  type="email"
                  value={birthdayForm.email}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, email: ev.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="people-field-7">Phone (optional)</label>
                <input id="people-field-7"
                  className="input"
                  type="tel"
                  value={birthdayForm.phone}
                  onChange={(ev) => setBirthdayForm({ ...birthdayForm, phone: ev.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="people-field-8">Notes (optional)</label>
              <textarea id="people-field-8"
                className="input"
                value={birthdayForm.notes}
                onChange={(ev) => setBirthdayForm({ ...birthdayForm, notes: ev.target.value })}
                rows={3}
              />
            </div>
            <div><button className="btn">Add individual</button></div>
          </form>
        </>
      )}

      {tab === 'anniversary' && (
        <>
          <div className="card form-grid">
            <p className="text-sm text-gray-600">
              Choose a date range. Results load only after you click Load. Active anniversary records only, with{' '}
              <strong>both</strong> partners active and not deceased (anniversary month/day falls on any day in the
              range).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="people-field-9">From date</label>
                <input id="people-field-9"
                  className="input max-w-xs"
                  type="date"
                  value={anniversaryFromInput}
                  onChange={(ev) => setAnniversaryFromInput(ev.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="people-field-10">To date</label>
                <input id="people-field-10"
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
            <h2 className="section-label">Anniversaries</h2>
            {!anniversaryApplied ? (
              <p className="text-gray-500">Enter from and to dates, then click Load to see results.</p>
            ) : anniversaryTotal === 0 ? (
              <p className="text-gray-500">No matching anniversaries in this range.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {anniversaryTotal} result{anniversaryTotal !== 1 ? 's' : ''} ·{' '}
                  {new Date(anniversaryApplied.from + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                  –{' '}
                  {new Date(anniversaryApplied.to + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="grid gap-2">
                  {anniversaryList.map((e: any) => (
                    <div key={e.id} className="card">
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {e.individualA?.displayName} &amp; {e.individualB?.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {longDate(e.anniversaryDate)}
                          </div>
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center shrink-0">
                          <StatusBadge status={e.status} />
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => openAnniversaryDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => toggleAnniversaryStatus(e.id, e.status)}
                          >
                            {e.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                      {expandedAnniversaryId === e.id && anniversaryDraft && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3 panel-enter">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label" htmlFor="people-field-11">Person 1</label>
                              <select id="people-field-11"
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
                              <label className="label" htmlFor="people-field-12">Person 2</label>
                              <select id="people-field-12"
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
                            <label className="label" htmlFor="people-field-13">Anniversary date</label>
                            <input id="people-field-13"
                              className="input max-w-xs"
                              type="date"
                              value={anniversaryDraft.anniversaryDate}
                              onChange={(ev) =>
                                setAnniversaryDraft({ ...anniversaryDraft, anniversaryDate: ev.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="people-field-14">Notes</label>
                            <textarea id="people-field-14"
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

          <form onSubmit={submitAnniversary} className="card form-grid">
            <h2 className="section-label">Add anniversary</h2>
            <p className="text-sm text-gray-600">
              Link two people already on file. Only anniversary date and notes are stored on this record.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="people-field-15">Person 1</label>
                <select id="people-field-15"
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
                <label className="label" htmlFor="people-field-16">Person 2</label>
                <select id="people-field-16"
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
              <label className="label" htmlFor="people-field-17">Anniversary date</label>
              <input id="people-field-17"
                className="input max-w-xs"
                type="date"
                value={anniversaryForm.anniversaryDate}
                onChange={(ev) => setAnniversaryForm({ ...anniversaryForm, anniversaryDate: ev.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="people-field-18">Notes (optional)</label>
              <textarea id="people-field-18"
                className="input"
                value={anniversaryForm.notes}
                onChange={(ev) => setAnniversaryForm({ ...anniversaryForm, notes: ev.target.value })}
                rows={2}
              />
            </div>
            <div><button className="btn">Add anniversary</button></div>
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
            <h2 className="section-label">Individuals</h2>
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
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {e.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {e.birthDate
                              ? longDate(e.birthDate)
                              : 'No date of birth'}
                            {e.email && ` · ${e.email}`}
                            {e.phone && ` · ${e.phone}`}
                          </div>
                          {e.dateOfDeath && (
                            <div className="text-sm text-gray-500 mt-1">
                              Date of death:{' '}
                              {longDate(e.dateOfDeath)}
                            </div>
                          )}
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center shrink-0">
                          <StatusBadge status={e.status} />
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => openIndividualDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => toggleIndividualStatus(e.id, e.status)}
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                      {expandedIndividualId === e.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3 panel-enter">
                          <div>
                            <label className="label" htmlFor="people-field-19">Date of death (optional)</label>
                            <p className="text-xs text-gray-500 mb-2">
                              Clear this if it was set in error; saving empty does not auto-activate—you can use
                              Reactivate.
                            </p>
                            <input id="people-field-19"
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
            <h2 className="section-label">Anniversaries</h2>
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
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {e.individualA?.displayName} &amp; {e.individualB?.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {longDate(e.anniversaryDate)}
                          </div>
                          {(e.individualA?.dateOfDeath || e.individualB?.dateOfDeath) && (
                            <div className="text-sm text-amber-800 mt-1">
                              Partner note: one or both people have a date of death on file—review before reactivating.
                            </div>
                          )}
                          {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center shrink-0">
                          <StatusBadge status={e.status} />
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => openAnniversaryDetails(e)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => toggleAnniversaryStatus(e.id, e.status)}
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                      {expandedAnniversaryId === e.id && anniversaryDraft && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid gap-3 panel-enter">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label" htmlFor="people-field-20">Person 1</label>
                              <select id="people-field-20"
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
                              <label className="label" htmlFor="people-field-21">Person 2</label>
                              <select id="people-field-21"
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
                            <label className="label" htmlFor="people-field-22">Anniversary date</label>
                            <input id="people-field-22"
                              className="input max-w-xs"
                              type="date"
                              value={anniversaryDraft.anniversaryDate}
                              onChange={(ev) =>
                                setAnniversaryDraft({ ...anniversaryDraft, anniversaryDate: ev.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="people-field-23">Notes</label>
                            <textarea id="people-field-23"
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
