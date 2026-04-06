export default async function handler(req, res) {
  // Expect a query parameter "url" with a full absolute URL (including http/https).
  const target = req.query.url;
  if (!target) {
    res.status(400).send('Missing "url" query parameter');
    return;
  }
  let dest;
  try {
    dest = new URL(target);
    if (!['http:', 'https:'].includes(dest.protocol)) throw new Error();
  } catch (_) {
    res.status(400).send('Invalid URL – must be absolute http(s) URL');
    return;
  }
  try {
    const upstream = await fetch(dest, {
      method: 'GET',
      redirect: 'follow',
    });
    // Copy status and headers, adding iframe‑friendly headers.
    const headers = new Headers(upstream.headers);
    headers.set('X-Frame-Options', 'ALLOWALL');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    // Stream the response body back to the client.
    res.writeHead(upstream.status, headers);
    upstream.body.pipeTo(new WritableStream({
      write(chunk) { res.write(chunk); },
      close() { res.end(); }
    }));
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(502).send('Bad gateway – could not fetch target');
  }
}
