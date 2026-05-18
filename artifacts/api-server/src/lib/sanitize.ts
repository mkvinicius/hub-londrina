import DOMPurify from 'isomorphic-dompurify';

export function sanitizeText(input: string): string {
  if (!input) return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeBusiness(data: Record<string, unknown>) {
  const fields = ['name', 'description', 'address', 'ownerName', 'tags'];
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      result[field] = sanitizeText(result[field] as string);
    }
  }
  return result;
}