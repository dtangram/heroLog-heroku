/**
 * The ID the app chose for a record it's creating.
 *
 * The React app gives a new wish list item, sale listing or message an ID
 * before sending it, and files it under that ID straight away. If the
 * database made up a different one, the app would be asking for, editing or
 * deleting a record the database doesn't know (a 404) until the page reloaded.
 * So a valid UUID sent by the app is used as the record's ID. Anything else
 * (missing, malformed) leaves the database to make one, as before. A clash
 * with an existing ID is refused by the database, never overwritten.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const clientId = (value: unknown): { id?: string } =>
  typeof value === 'string' && UUID.test(value) ? { id: value } : {};