import { z } from 'zod';

/** Turn a zod error into one plain-English sentence for the screen. */
export function firstIssue(err: z.ZodError): string {
  const i = err.issues[0];
  return i ? i.message : 'Some details are missing or not valid.';
}

const money = z.coerce.number({ invalid_type_error: 'Value must be a number.' }).min(0, 'Value cannot be negative.').max(1e10);

export const assetSchema = z.object({
  reference: z.string().trim().min(1, 'Please enter what the item is (for example: Microphone).').max(200),
  value: money,
  quantity: z.coerce.number().int('Quantity must be a whole number.').min(0, 'Quantity cannot be negative.').max(1e6),
  labelCategory: z.string().trim().min(1, 'Please choose a category (for example: Chapel or Hall).').max(100),
  notes: z.string().max(2000).optional().nullable().transform((v) => (v ? v : null)),
});

export const noticeSchema = z.object({
  title: z.string().trim().min(1, 'Please enter a title.').max(200),
  bodyHtml: z.string().min(1, 'Please write the notice.').max(200_000),
  weekOf: z.coerce.date({ invalid_type_error: 'Please choose the week this notice is for.' }),
});

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional().transform((v) => (v ? v : v === undefined ? undefined : null));
const isoDate = (msg: string) =>
  z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), msg).transform((v) => new Date(v).toISOString());

export const individualCreateSchema = z.object({
  displayName: z.string().trim().min(1, 'Please enter the person’s name.').max(200),
  birthDate: isoDate('Please enter a valid date of birth.'),
  email: optionalText(200),
  phone: optionalText(50),
  notes: optionalText(2000),
});

export const individualUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Name cannot be empty.').max(200).optional(),
    birthDate: z.union([isoDate('Please enter a valid date of birth.'), z.null()]).optional(),
    email: optionalText(200),
    phone: optionalText(50),
    notes: optionalText(2000),
    status: z.enum(['active', 'inactive']).optional(),
    dateOfDeath: z.union([isoDate('Please enter a valid date of death.'), z.null(), z.literal('').transform(() => null)]).optional(),
  })
  .strip();

export const anniversaryCreateSchema = z.object({
  individualAId: z.coerce.number().int().positive('Please choose the first person.'),
  individualBId: z.coerce.number().int().positive('Please choose the second person.'),
  anniversaryDate: isoDate('Please enter a valid wedding date.'),
  notes: optionalText(2000),
});

export const anniversaryUpdateSchema = z
  .object({
    individualAId: z.coerce.number().int().positive().optional(),
    individualBId: z.coerce.number().int().positive().optional(),
    anniversaryDate: isoDate('Please enter a valid wedding date.').optional(),
    notes: optionalText(2000),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strip();

/** Drop keys whose value is undefined, so the approval shows only what changes. */
export function definedOnly<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
