import { getSubmitLabel, toCoverType } from '../forms';

describe('toCoverType', () => {
  it.each([
    ['regular', 'Regular'],
    ['Regular', 'Regular'],
    ['VARIANT', 'Variant'],
    [' variant ', 'Variant'],
  ])('turns %p into %p for the radio buttons', (value, expected) => {
    expect(toCoverType(value)).toBe(expected);
  });

  it.each([undefined, null, '', 'special'])('leaves %p unselected', value => {
    expect(toCoverType(value)).toBe('');
  });
});

describe('getSubmitLabel', () => {
  it('shows SUBMITTING while saving, otherwise UPDATE or SUBMIT', () => {
    expect(getSubmitLabel(true, true)).toBe('SUBMITTING');
    expect(getSubmitLabel(false, true)).toBe('UPDATE');
    expect(getSubmitLabel(false, false)).toBe('SUBMIT');
  });
});