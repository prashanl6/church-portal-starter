import fetch from 'node-fetch';

/**
 * Try to fetch view/engagement counts for a Facebook URL using the Graph API.
 * Requires `FACEBOOK_ACCESS_TOKEN` env var to be set. Returns number or null.
 */
export async function fetchFacebookViews(link: string): Promise<number | null> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) return null;

  try {
    // Use the Graph API to fetch engagement for a URL. This is a best-effort approach.
    const url = `https://graph.facebook.com/?id=${encodeURIComponent(link)}&fields=engagement&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json() as any;
    // engagement may contain reaction_count, comment_count, share_count
    const engagement = json?.engagement;
    if (!engagement) return null;
    // Prefer reaction_count, then share_count
    const v = typeof engagement.reaction_count === 'number' ? engagement.reaction_count : (typeof engagement.share_count === 'number' ? engagement.share_count : null);
    return v === null ? null : Number(v);
  } catch (e) {
    return null;
  }
}
