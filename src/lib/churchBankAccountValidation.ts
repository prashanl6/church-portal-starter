/** Bank and branch: letters and spaces only (no digits or punctuation). */
const LETTERS_AND_SPACES_ONLY = /^[A-Za-z ]+$/;

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
  if (!/^\d+$/.test(accountNumber)) {
    return { ok: false, error: 'Account number may contain digits only' };
  }
  if (!accountName || accountName.length > 200) {
    return { ok: false, error: 'Account name is required (max 200 characters)' };
  }
  if (!bankName) {
    return { ok: false, error: 'Bank is required' };
  }
  if (!LETTERS_AND_SPACES_ONLY.test(bankName) || !bankName.replace(/\s/g, '').length) {
    return { ok: false, error: 'Bank must use letters and spaces only' };
  }
  if (!branch) {
    return { ok: false, error: 'Branch is required' };
  }
  if (!LETTERS_AND_SPACES_ONLY.test(branch) || !branch.replace(/\s/g, '').length) {
    return { ok: false, error: 'Branch must use letters and spaces only' };
  }

  return { ok: true, data: { accountNumber, accountName, bankName, branch } };
}
