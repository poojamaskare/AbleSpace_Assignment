import { Transform } from 'class-transformer';

/**
 * Trim a string before validators run.
 *
 * Without this, `@MinLength(1)` happily accepts "   " — it is three characters —
 * and the service trims it afterwards into an empty name. Transforming first
 * means length rules apply to what actually gets stored.
 */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
