const SUNO_API_BASE = 'https://api.sunoapi.org';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = event.headers || {};
  const apiKey = headers['x-suno-key'] || headers['X-Suno-Key'];
  const taskId = event.queryStringParameters && event.queryStringParameters.taskId;

  if (!apiKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing API key' }) };
  }
  if (!taskId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId' }) };
  }

  try {
    const upstream = await fetch(
      `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

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
