import { POSITION_STEP, positionFor } from './position';

describe('positionFor', () => {
  it('seeds the first task in an empty column', () => {
    expect(positionFor([], 0)).toBe(POSITION_STEP);
  });

  it('places a task dropped at the top before the current first', () => {
    expect(positionFor([1000, 2000], 0)).toBeLessThan(1000);
  });

  it('places a task dropped at the end after the current last', () => {
    expect(positionFor([1000, 2000], 2)).toBeGreaterThan(2000);
  });

  it('takes the midpoint between neighbours', () => {
    expect(positionFor([1000, 2000], 1)).toBe(1500);
  });

  it('keeps a strict order across repeated inserts into the same gap', () => {
    const siblings = [1000, 2000];

    for (let i = 0; i < 20; i++) {
      const next = positionFor(siblings, 1);
      expect(next).toBeGreaterThan(siblings[0]);
      expect(next).toBeLessThan(siblings[1]);
      siblings.splice(1, 0, next);
    }

    expect(siblings).toEqual([...siblings].sort((a, b) => a - b));
  });
});
