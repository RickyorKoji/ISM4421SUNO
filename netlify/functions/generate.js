const SUNO_API_BASE = 'https://api.sunoapi.org';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { apiKey, payload } = body;

  if (!apiKey || typeof apiKey !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing API key' }) };
  }
  if (!payload || typeof payload !== 'object') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing generation payload' }) };
  }

  const requestBody = {
    ...payload,
    // record-info polling is used instead of a real webhook, so this just
    // needs to be a well-formed URL to satisfy the required field.
    callBackUrl: payload.callBackUrl || 'https://example.com/suno-callback',
  };

  try {
    const upstream = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
