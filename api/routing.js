export function getExpressApiUrl(params, requestUrl = '') {
  const parsedUrl = new URL(requestUrl || '/', 'http://localhost');
  let apiPath = params?.__drawbay_path;

  // Vercel rewrites can arrive either with the captured path in the query or
  // with the original API URL. Handle both forms so function routing does not
  // depend on rewrite query parameters being preserved by the platform.
  if (Array.isArray(apiPath)) apiPath = apiPath.join('/');
  if (typeof apiPath !== 'string' || !apiPath) {
    if (parsedUrl.pathname === '/api/index' && parsedUrl.searchParams.has('__drawbay_path')) {
      apiPath = parsedUrl.searchParams.get('__drawbay_path');
      params = Object.fromEntries(parsedUrl.searchParams.entries());
    } else if (parsedUrl.pathname.startsWith('/api/') && parsedUrl.pathname !== '/api/index') {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    } else {
      return null;
    }
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (key === '__drawbay_path') continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string') query.append(key, item);
    }
  }

  const search = query.toString();
  return `/api/${apiPath}${search ? `?${search}` : ''}`;
}
