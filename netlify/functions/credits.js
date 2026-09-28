const SUNO_API_BASE = 'https://api.sunoapi.org';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = event.headers || {};
  const apiKey = headers['x-suno-key'] || headers['X-Suno-Key'];

  if (!apiKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing API key' }) };
  }

  try {
    const upstream = await fetch(`${SUNO_API_BASE}/api/v1/generate/credit`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Upstream request failed', detail: String(err) }),
    };
  }
};
