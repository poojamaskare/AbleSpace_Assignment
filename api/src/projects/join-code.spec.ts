import { Prisma } from '@prisma/client';

import { joinCode, withUniqueCode } from './join-code';

const taken = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('joinCode', () => {
  it('is always six digits', () => {
    for (let i = 0; i < 500; i++) {
      expect(joinCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('withUniqueCode', () => {
  it('passes a code to the write and returns its result', async () => {
    const write = jest.fn().mockResolvedValue('project');

    await expect(withUniqueCode(write)).resolves.toBe('project');
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/));
  });

  it('re-rolls when the code is already taken', async () => {
    const write = jest
      .fn()
      .mockRejectedValueOnce(taken())
      .mockResolvedValue('project');

    await expect(withUniqueCode(write)).resolves.toBe('project');
    expect(write).toHaveBeenCalledTimes(2);
    // A re-roll that reused the code would loop until it gave up.
    expect(write.mock.calls[0][0]).not.toBe(write.mock.calls[1][0]);
  });

  it('gives up rather than retrying forever', async () => {
    const write = jest.fn().mockRejectedValue(taken());

    await expect(withUniqueCode(write)).rejects.toThrow('Unique constraint failed');
    expect(write).toHaveBeenCalledTimes(6);
  });

  it('does not retry errors that are not a code collision', async () => {
    const write = jest.fn().mockRejectedValue(new Error('database is down'));

    await expect(withUniqueCode(write)).rejects.toThrow('database is down');
    expect(write).toHaveBeenCalledTimes(1);
  });
});
