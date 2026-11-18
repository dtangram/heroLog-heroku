import { act, renderHook } from '@testing-library/react';
import { FormEvent } from 'react';
import { useFormSubmit, REDIRECT_DELAY } from './useFormSubmit';
import { getSubmitLabel } from '../utils/forms';

const submitEvent = () => ({ preventDefault: jest.fn() }) as unknown as FormEvent<HTMLFormElement>;

beforeEach(() => {
  jest.useFakeTimers();
  window.scrollTo = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getSubmitLabel', () => {
  it('shows SUBMITTING while saving, otherwise UPDATE or SUBMIT', () => {
    expect(getSubmitLabel(true, true)).toBe('SUBMITTING');
    expect(getSubmitLabel(false, true)).toBe('UPDATE');
    expect(getSubmitLabel(false, false)).toBe('SUBMIT');
  });
});

describe('useFormSubmit', () => {
  it('does not save when validation fails', async () => {
    const save = jest.fn();
    const { result } = renderHook(() =>
      useFormSubmit({ validate: () => false, save, onSaved: jest.fn(), onError: jest.fn() })
    );

    await act(() => result.current.handleSubmit(submitEvent()));

    expect(save).not.toHaveBeenCalled();
    expect(result.current.isSaved).toBe(false);
  });

  it('marks the form saved and calls onSaved after the delay', async () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      useFormSubmit({ validate: () => true, save: async () => ({ ok: true, data: {} }), onSaved, onError: jest.fn() })
    );

    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.isSaved).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(REDIRECT_DELAY);
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the error instead of success when the API rejects the save', async () => {
    const onSaved = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useFormSubmit({
        validate: () => true,
        save: async () => ({ ok: false, error: 'Comic issue must be a valid number' }),
        onSaved,
        onError,
      })
    );

    await act(() => result.current.handleSubmit(submitEvent()));
    act(() => {
      jest.advanceTimersByTime(REDIRECT_DELAY);
    });

    expect(onError).toHaveBeenCalledWith('Comic issue must be a valid number');
    expect(result.current.isSaved).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });
});