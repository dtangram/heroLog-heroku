import type { JsonValue } from '../types/json';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const clientId = (value: JsonValue | undefined): { id?: string } =>
  typeof value === 'string' && UUID.test(value) ? { id: value } : {};