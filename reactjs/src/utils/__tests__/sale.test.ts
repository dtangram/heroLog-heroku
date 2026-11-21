import { formatPrice, validatePrice } from '../sale';

describe('formatPrice', () => {
  it.each([
    ['12.50', '$12.50'],
    ['12.5', '$12.50'],
    [7, '$7.00'],
    ['1250', '$1,250.00'],
  ])('shows %p as %p', (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });

  it.each([null, undefined, '', '  ', '0', 'abc'])('has no price to show for %p', value => {
    expect(formatPrice(value)).toBeNull();
  });
});

describe('validatePrice', () => {
  it.each(['12', '12.5', '12.50', '0.01', '99999.99'])('accepts %p', value => {
    expect(validatePrice(value)).toBeNull();
  });

  it.each([
    ['', 'Price is required'],
    ['12.', 'Price must be a dollar amount, like 12.50'],
    ['.50', 'Price must be a dollar amount, like 12.50'],
    ['0', 'Price must be at least $0.01'],
    ['100000', 'Price must be $99,999.99 or less'],
  ])('rejects %p', (value, message) => {
    expect(validatePrice(value)).toBe(message);
  });
});