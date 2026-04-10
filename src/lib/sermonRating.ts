/**
 * Aggregate sermon rating from individual 1–5 star votes.
 * averageRating = (sum of all stars) / (number of ratings), rounded to one decimal.
 */
export function computeSermonRatingStats(totalStars: number, ratingCount: number): {
  averageRating: number | null;
  ratingCount: number;
} {
  if (ratingCount <= 0 || totalStars < 0) {
    return { averageRating: null, ratingCount: 0 };
  }
  const avg = totalStars / ratingCount;
  return { averageRating: Math.round(avg * 10) / 10, ratingCount };
}

export type RatingGroupRow = {
  sermonId: number;
  _sum: { stars: number | null };
  _count: { _all: number };
};

export function ratingAggregatesFromGroupBy(rows: RatingGroupRow[]): Map<
  number,
  { totalStars: number; ratingCount: number; averageRating: number | null }
> {
  const map = new Map<
    number,
    { totalStars: number; ratingCount: number; averageRating: number | null }
  >();
  for (const row of rows) {
    const totalStars = row._sum.stars ?? 0;
    const ratingCount = row._count._all;
    const { averageRating } = computeSermonRatingStats(totalStars, ratingCount);
    map.set(row.sermonId, { totalStars, ratingCount, averageRating });
  }
  return map;
}

const CLIENT_ID_RE = /^[\w-]{8,128}$/;

export function isValidRaterClientId(id: unknown): id is string {
  return typeof id === 'string' && CLIENT_ID_RE.test(id);
}
