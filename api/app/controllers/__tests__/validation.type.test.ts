/// <reference types="jest" />
import { NextFunction, Request, Response } from 'express';
import { validate } from '../validation';

const SALE_ID = '185e2f4a-3816-4184-8340-e35ecdde5a22';
const USER_ID = '11111111-2222-4333-8444-555555555555';

const mockRes = () => {
  const res = {} as Response & { status: jest.Mock; json: jest.Mock };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/** Runs a route's checks the way Express would, and reports what happened */
const runChecks = async (method: string, body: Record<string, unknown>, params: Record<string, string> = {}) => {
  const req = { body, params, query: {}, headers: {}, cookies: {} } as unknown as Request;
  const res = mockRes();
  const next = jest.fn() as unknown as NextFunction & jest.Mock;

  const steps = validate(method);
  const chains = steps.slice(0, -1) as Array<{ run: (r: Request) => Promise<unknown> }>;
  for (const chain of chains) {
    await chain.run(req);
  }
  const checkForErrors = steps[steps.length - 1] as (r: Request, s: Response, n: NextFunction) => void;
  checkForErrors(req, res, next);

  return { req, res, next };
};

// The three forms that send a cover type, with just enough fields to pass the other checks
const forms: Array<[string, Record<string, unknown>, Record<string, string>?]> = [
  ['createComicBook', { title: 'Batman' }],
  ['editComicBook', { id: SALE_ID, title: 'Batman' }],
  ['createSaleList', { comicBookTitle: 'Batman', comicBookPublisher: 'DC Comics', saleUsersId: USER_ID }],
  ['editSaleList', { id: SALE_ID, comicBookTitle: 'Batman' }],
  ['createWishList', { comicBookTitle: 'Batman', comicBookPublisher: 'DC Comics', wishUsersId: USER_ID }],
  ['editWishList', { id: SALE_ID, comicBookTitle: 'Batman' }],
];

describe('cover type check on every form route', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  describe.each(forms)('%s', (method, body) => {
    it.each(['Regular', 'Variant', 'regular', 'VARIANT', ' Regular '])(
      'accepts %p and passes it on in lowercase',
      async type => {
        const { req, res, next } = await runChecks(method, { ...body, type });

        expect(res.status).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        expect(req.body.type).toBe(type.trim().toLowerCase());
      }
    );

    it('still rejects a type that is neither', async () => {
      const { res, next } = await runChecks(method, { ...body, type: 'Special' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([{ field: 'type', message: 'Comic Book must be regular or variant.' }]),
        })
      );
    });
  });
});