import { randomInt } from 'node:crypto';

/**
 * The pickable profile pictures, served as static files by the web app.
 *
 * ponytail: the same list lives in `web/src/lib/avatars.ts` for the picker.
 * Two constants beat a shared package for eight strings — but add to both, or
 * the API will reject a preset the UI happily offers.
 */
export const AVATAR_PRESETS = [
  '/avatars/flower.svg',
  '/avatars/ship.svg',
  '/avatars/rocket.svg',
  '/avatars/star.svg',
  '/avatars/leaf.svg',
  '/avatars/planet.svg',
  '/avatars/mountain.svg',
  '/avatars/moon.svg',
] as const;

/** Every new user gets a face rather than a grey placeholder they must fix. */
export const randomAvatar = () => AVATAR_PRESETS[randomInt(AVATAR_PRESETS.length)];

export const isPreset = (url: string | null): boolean =>
  url !== null && AVATAR_PRESETS.includes(url as (typeof AVATAR_PRESETS)[number]);
