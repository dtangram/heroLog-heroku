import { saveUnlessDuplicate } from '../duplicates';
import { showConfirm } from '../../components/dialog';

jest.mock('../../components/dialog', () => ({ showConfirm: jest.fn() }));

const issueDuplicate = {
  ok: false,
  error: 'You already have Detective Comics #659 in this list.',
  status: 409,
  duplicate: { kind: 'issue', id: 'i1', name: 'Detective Comics #659', canSaveAnyway: true },
};

describe('saveUnlessDuplicate', () => {
  beforeEach(() => (showConfirm as jest.Mock).mockReset());

  it('saves once when there is no duplicate', async () => {
    const save = jest.fn().mockResolvedValue({ ok: true, data: {} });
    await expect(saveUnlessDuplicate(save)).resolves.toEqual({ ok: true, data: {} });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(false);
    expect(showConfirm).not.toHaveBeenCalled();
  });

  it('asks, then saves a second copy when the user confirms', async () => {
    (showConfirm as jest.Mock).mockResolvedValue(true);
    const save = jest.fn().mockResolvedValueOnce(issueDuplicate).mockResolvedValueOnce({ ok: true, data: {} });

    await expect(saveUnlessDuplicate(save)).resolves.toEqual({ ok: true, data: {} });
    expect(showConfirm).toHaveBeenCalledWith(
      'You already have Detective Comics #659. Do you want to save another copy?',
      expect.objectContaining({ confirmLabel: 'Save another copy' })
    );
    expect(save).toHaveBeenLastCalledWith(true);
  });

  it("doesn't save when the user says no, and says why", async () => {
    (showConfirm as jest.Mock).mockResolvedValue(false);
    const save = jest.fn().mockResolvedValue(issueDuplicate);

    await expect(saveUnlessDuplicate(save)).resolves.toEqual({
      ok: false,
      error: 'Not saved. You already have Detective Comics #659.',
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("doesn't offer a second copy of a publisher or title", async () => {
    const titleDuplicate = { ...issueDuplicate, duplicate: { kind: 'title', id: 't1', name: 'Batman', canSaveAnyway: false } };
    const save = jest.fn().mockResolvedValue(titleDuplicate);

    await expect(saveUnlessDuplicate(save)).resolves.toBe(titleDuplicate);
    expect(showConfirm).not.toHaveBeenCalled();
  });
});