import { uniqueViewers, type Viewer } from './realtime.gateway';

const pooja: Viewer = { id: 'u1', name: 'Pooja', avatarUrl: null };
const sam: Viewer = { id: 'u2', name: 'Sam', avatarUrl: 'https://x/y.png' };

const socket = (viewer?: Viewer) => ({ data: { viewer } });

describe('uniqueViewers', () => {
  it('is empty when nobody is watching', () => {
    expect(uniqueViewers([])).toEqual([]);
  });

  it('lists everyone in the room', () => {
    expect(uniqueViewers([socket(pooja), socket(sam)])).toEqual([pooja, sam]);
  });

  it('counts one person with several tabs once', () => {
    expect(uniqueViewers([socket(pooja), socket(pooja), socket(sam)])).toEqual([
      pooja,
      sam,
    ]);
  });

  it('skips sockets that never finished authenticating', () => {
    expect(uniqueViewers([socket(undefined), socket(sam)])).toEqual([sam]);
  });
});
