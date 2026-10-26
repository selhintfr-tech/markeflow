export type CompetitorFormValues = Record<string, string>;
export type CompetitorFieldErrors = Record<string, string>;

export function validateCompetitor(values: CompetitorFormValues): CompetitorFieldErrors {
  const errors: CompetitorFieldErrors = {};
  const name = (values.name || '').trim();
  const website = (values.website || '').trim();
  const evidence = (values.evidence || '').trim();
  const price = (values.price || '').trim();
  const currency = (values.currency || '').trim();
  const reviewedOn = (values.reviewed_on || '').trim();

  if (!name) errors.name = 'Enter a competitor name.';
  else if (name.length > 255) errors.name = 'Competitor name must be 255 characters or fewer.';

  for (const [field, value, label] of [
    ['website', website, 'Website'],
    ['evidence', evidence, 'Evidence URL'],
  ] as const) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol.');
    } catch {
      errors[field] = `${label} must be a valid http or https URL.`;
    }
    if (value.length > 2048) errors[field] = `${label} must be 2048 characters or fewer.`;
  }

  if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
    errors.price = 'Price must be a non-negative number.';
  }
  if (currency && !/^[a-zA-Z]{3}$/.test(currency)) {
    errors.currency = 'Enter a three-letter currency code, such as MAD or USD.';
  }
  if (reviewedOn) {
    const parsedDate = new Date(`${reviewedOn}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== reviewedOn) {
      errors.reviewed_on = 'Enter a valid review date.';
    }
  }

  return errors;
}
