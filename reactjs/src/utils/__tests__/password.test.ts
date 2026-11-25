import { passwordProblem } from '../password';

describe('passwordProblem (same rule as the API)', () => {
  it('accepts 8+ characters with a letter and a number', () => {
    expect(passwordProblem('batman1989')).toBe('');
  });

  it('explains each way a password can fail', () => {
    expect(passwordProblem('bat1')).toBe('Password must be at least 8 characters');
    expect(passwordProblem('comicbooks')).toBe('Password must include a number');
    expect(passwordProblem('12345678')).toBe('Password must include a letter');
    expect(passwordProblem(`a1${'x'.repeat(127)}`)).toBe('Password must be 128 characters or fewer');
  });
});