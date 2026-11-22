import reducer from './reducer';
import { DELETE_PUBLISHER_SUCCESS, REQ_PUBLISHERS_SUCCESS } from '../actionTypes';

const publisher = (id: string, publisherName: string) => ({ id, publisherName, userId: 'user-1' });

describe('publishers list', () => {
  it('shows exactly the publishers the server sends, dropping any that were deleted', () => {
    const before = reducer(undefined, {
      type: REQ_PUBLISHERS_SUCCESS,
      data: [publisher('dc', 'DC'), publisher('dynamite', 'Dynamite')],
    });

    const after = reducer(before, { type: REQ_PUBLISHERS_SUCCESS, data: [publisher('dc', 'DC')] });

    expect(after.allIds).toEqual(['dc']);
    expect(after.byId.dynamite).toBeUndefined();
  });

  it('removes a publisher once it is deleted', () => {
    const before = reducer(undefined, {
      type: REQ_PUBLISHERS_SUCCESS,
      data: [publisher('dc', 'DC'), publisher('dynamite', 'Dynamite')],
    });

    const after = reducer(before, { type: DELETE_PUBLISHER_SUCCESS, payload: { id: 'dynamite' } });

    expect(after.allIds).toEqual(['dc']);
  });
});