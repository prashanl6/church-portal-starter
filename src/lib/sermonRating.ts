/**
 * Sermon "rating" is the number of views (requirement: views 360 → rating 360).
 * Each device gets a random id stored in the browser so it is counted once per sermon.
 */
const CLIENT_ID_RE = /^[\w-]{8,128}$/;

export function isValidRaterClientId(id: unknown): id is string {
  return typeof id === 'string' && CLIENT_ID_RE.test(id);
}
