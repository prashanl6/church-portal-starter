/**
 * Bank and branch names: letters, numbers, spaces and simple punctuation, because real
 * names look like "Colombo 03" or "St. Mark's Road". Must contain at least one letter.
 */
const NAME_CHARS = /^[A-Za-z0-9 .,'&()\/-]+$/;
const validName = (v: string) => NAME_CHARS.test(v) && /[A-Za-z]/.test(v);

export type ChurchBankAccountPayload = {
  accountNumber: string;
  accountName: string;
  bankName: string;
  branch: string;
};

export function parseChurchBankAccountPayload(body: unknown):
  | { ok: true; data: ChurchBankAccountPayload }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const accountNumber = String(b.accountNumber ?? '').trim();
  const accountName = String(b.accountName ?? '').trim();
  const bankName = String(b.bankName ?? '').trim();
  const branch = String(b.branch ?? '').trim();

  if (!accountNumber) {
    return { ok: false, error: 'Account number is required' };
  }
  if (!/^\d{4,30}$/.test(accountNumber)) {
    return { ok: false, error: 'Account number may contain digits only (no spaces or dashes)' };
  }
  if (!accountName || accountName.length > 200) {
    return { ok: false, error: 'Account name is required (max 200 characters)' };
  }
  if (!bankName) {
    return { ok: false, error: 'Bank is required' };
  }
  if (!validName(bankName) || bankName.length > 120) {
    return { ok: false, error: 'Bank name can use letters, numbers, spaces and . , \' & ( ) / - only' };
  }
  if (!branch) {
    return { ok: false, error: 'Branch is required' };
  }
  if (!validName(branch) || branch.length > 120) {
    return { ok: false, error: 'Branch can use letters, numbers, spaces and . , \' & ( ) / - only' };
  }

  return { ok: true, data: { accountNumber, accountName, bankName, branch } };
}
