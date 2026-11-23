/// <reference types="jest" />
import { clientId } from './clientId';

describe('clientId', () => {
  it("uses the app's ID when it's a valid UUID", () => {
    expect(clientId('0c045a2f-5683-41c4-86bf-e062366dcf4c')).toEqual({ id: '0c045a2f-5683-41c4-86bf-e062366dcf4c' });
  });

  it('leaves the database to make an ID when none, or a bad one, is sent', () => {
    expect(clientId(undefined)).toEqual({});
    expect(clientId('')).toEqual({});
    expect(clientId('not-a-uuid')).toEqual({});
    expect(clientId("0c045a2f-5683-41c4-86bf-e062366dcf4c'; DROP TABLE")).toEqual({});
    expect(clientId(42)).toEqual({});
  });
});