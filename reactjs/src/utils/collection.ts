export const countLabel = (count: number | null | undefined, singular: string, plural = `${singular}s`): string => {
  const n = Number(count) || 0;
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : plural}`;
};

export const issueRange = (first: number | null | undefined, last: number | null | undefined): string | null => {
  if (first === null || first === undefined) return null;
  if (last === null || last === undefined || last === first) return `#${first}`;
  return `#${first}–#${last}`;
};