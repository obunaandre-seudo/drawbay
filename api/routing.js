export function getExpressApiUrl(params) {
  const apiPath = params?.__drawbay_path;
  if (typeof apiPath !== 'string' || !apiPath) return null;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === '__drawbay_path') continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string') query.append(key, item);
    }
  }

  const search = query.toString();
  return `/api/${apiPath}${search ? `?${search}` : ''}`;
}
