(() => {
  'use strict';

  const LS_KEY = 'sunoforge_api_key';
  const LS_HISTORY = 'sunoforge_history';
  const POLL_INTERVAL_MS = 5000;
  const POLL_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes
  const MAX_HISTORY = 24;

  const $ = (id) => document.getElementById(id);

  // Elements
  const apiKeyInput = $('apiKeyInput');
  const toggleKeyVisibility = $('toggleKeyVisibility');
  const saveKeyBtn = $('saveKeyBtn');
  const clearKeyBtn = $('clearKeyBtn');
  const checkCreditsBtn = $('checkCreditsBtn');
  const keyMessage = $('keyMessage');
  const keyStatusDot = $('keyStatusDot');
  const creditsPill = $('creditsPill');
  const creditsValue = $('creditsValue');

  const modeButtons = document.querySelectorAll('.mode-btn');
  const panelSimple = $('panel-simple');
  const panelCustom = $('panel-custom');
  const customAdvanced = $('customAdvanced');

  const generateForm = $('generateForm');
  const generateBtn = $('generateBtn');
  const progressBox = $('progressBox');
  const progressText = $('progressText');
  const errorBox = $('errorBox');

  const trackGrid = $('trackGrid');
  const emptyState = $('emptyState');
  const clearHistoryBtn = $('clearHistoryBtn');
  const trackCardTemplate = $('trackCardTemplate');

  const durationRange = $('durationRange');
  const durationOut = $('durationOut');
  const styleWeight = $('styleWeight');
  const styleWeightOut = $('styleWeightOut');
  const weirdnessConstraint = $('weirdnessConstraint');
  const weirdnessOut = $('weirdnessOut');

  let mode = 'simple';
  let pollTimer = null;
  let pollDeadline = 0;
  const renderedIds = new Set();

  // ---------- API key ----------
  function getApiKey() {
    return (localStorage.getItem(LS_KEY) || '').trim();
  }

  function refreshKeyStatus() {
    const key = getApiKey();
    keyStatusDot.className = 'status-dot' + (key ? ' ok' : '');
  }

  apiKeyInput.value = getApiKey();
  refreshKeyStatus();

  toggleKeyVisibility.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  saveKeyBtn.addEventListener('click', () => {
    const value = apiKeyInput.value.trim();
    if (!value) {
      showKeyMessage('Enter a key first.', true);
      return;
    }
    localStorage.setItem(LS_KEY, value);
    refreshKeyStatus();
    showKeyMessage('Saved to this browser.', false);
  });

  clearKeyBtn.addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    apiKeyInput.value = '';
    refreshKeyStatus();
    creditsPill.hidden = true;
    showKeyMessage('Key cleared.', false);
  });

  function showKeyMessage(text, isError) {
    keyMessage.textContent = text;
    keyMessage.className = 'inline-message ' + (isError ? 'bad' : 'ok');
  }

  checkCreditsBtn.addEventListener('click', async () => {
    const key = getApiKey();
    if (!key) {
      showKeyMessage('Save an API key first.', true);
      return;
    }
    showKeyMessage('Checking…', false);
    try {
      const res = await fetch('/.netlify/functions/credits', {
        headers: { 'x-suno-key': key },
      });
      const data = await res.json();
      if (!res.ok || data.code !== 200) {
        throw new Error(data.msg || `Request failed (${res.status})`);
      }
      creditsValue.textContent = data.data;
      creditsPill.hidden = false;
      showKeyMessage('Key is valid.', false);
    } catch (err) {
      showKeyMessage(err.message || 'Could not verify key.', true);
    }
  });

  // ---------- Mode toggle ----------
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      modeButtons.forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      panelSimple.classList.toggle('hidden', mode !== 'simple');
      panelCustom.classList.toggle('hidden', mode !== 'custom');
      customAdvanced.style.display = mode === 'custom' ? '' : 'none';
    });
  });
  customAdvanced.style.display = 'none';

  // ---------- Range outputs ----------
  durationRange.addEventListener('input', () => (durationOut.textContent = durationRange.value));
  styleWeight.addEventListener('input', () => (styleWeightOut.textContent = styleWeight.value));
  weirdnessConstraint.addEventListener('input', () => (weirdnessOut.textContent = weirdnessConstraint.value));

  // ---------- Generate ----------
  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const key = getApiKey();
    if (!key) {
      showError('Save your Suno API key above before generating.');
      return;
    }

    const instrumental = $('instrumentalCheck').checked;
    const model = $('modelSelect').value;

    let payload;
    if (mode === 'simple') {
      const prompt = $('simplePrompt').value.trim();
      const style = $('simpleStyle').value.trim();
      const lyrics = $('simpleLyrics').value.trim();

      if (!style) {
        showError('Style is required in Simple mode.');
        return;
      }

      payload = {
        customMode: false,
        instrumental,
        model,
        style,
      };
      if (prompt) payload.prompt = prompt;
      if (lyrics) payload.lyrics = lyrics;
    } else {
      const title = $('customTitle').value.trim();
      const style = $('customStyle').value.trim();
      const lyrics = $('customLyrics').value.trim();
      const negativeTags = $('customNegativeTags').value.trim();
      const vocalGender = $('vocalGender').value;

      if (!style && !lyrics && !negativeTags) {
        showError('Provide at least a style, lyrics, or negative tags in Custom mode.');
        return;
      }
      if (!instrumental && !lyrics) {
        showError('Add lyrics, or enable Instrumental, in Custom mode.');
        return;
      }

      payload = {
        customMode: true,
        instrumental,
        model,
        styleWeight: Number(styleWeight.value),
        weirdnessConstraint: Number(weirdnessConstraint.value),
        variety: Number($('varietySelect').value),
        duration: Number(durationRange.value),
      };
      if (title) payload.title = title;
      if (style) payload.style = style;
      if (lyrics) payload.lyrics = lyrics;
      if (negativeTags) payload.negativeTags = negativeTags;
      if (vocalGender) payload.vocalGender = vocalGender;
    }

    setGenerating(true);
    setProgress(true, 'Submitting task…');

    try {
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, payload }),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 200) {
        throw new Error(describeError(res.status, data));
      }

      const taskId = data.data && data.data.taskId;
      if (!taskId) throw new Error('No task ID returned by the API.');

      setProgress(true, 'Task queued — generating (this usually takes 1–3 minutes)…');
      pollDeadline = Date.now() + POLL_TIMEOUT_MS;
      pollTask(taskId, key);
    } catch (err) {
      setGenerating(false);
      setProgress(false);
      showError(err.message || 'Something went wrong.');
    }
  });

  function describeError(status, data) {
    const msg = (data && data.msg) || '';
    if (status === 429 || data.code === 429) return 'Insufficient credits on this API key.';
    if (status === 401 || data.code === 401) return 'Invalid API key.';
    if (status === 405 || data.code === 405) return 'Rate limit exceeded — try again shortly.';
    if (status === 430 || data.code === 430) return 'Calling too frequently — please wait a moment.';
    return msg || `Request failed (${status})`;
  }

  function pollTask(taskId, key) {
    clearTimeout(pollTimer);

    const tick = async () => {
      if (Date.now() > pollDeadline) {
        setGenerating(false);
        setProgress(false);
        showError('Timed out waiting for the track. Check your Suno account — it may still finish.');
        return;
      }

      try {
        const res = await fetch(`/.netlify/functions/status?taskId=${encodeURIComponent(taskId)}`, {
          headers: { 'x-suno-key': key },
        });
        const data = await res.json();

        if (!res.ok || data.code !== 200) {
          throw new Error(describeError(res.status, data));
        }

        const record = data.data || {};
        const status = record.status;
        const sunoData = (record.response && record.response.sunoData) || [];

        if (sunoData.length) {
          renderTracks(sunoData, status);
        }

        if (status === 'SUCCESS') {
          setGenerating(false);
          setProgress(false);
          return;
        }

        if (
          status === 'CREATE_TASK_FAILED' ||
          status === 'GENERATE_AUDIO_FAILED' ||
          status === 'CALLBACK_EXCEPTION' ||
          status === 'SENSITIVE_WORD_ERROR'
        ) {
          setGenerating(false);
          setProgress(false);
          showError(record.errorMessage || `Generation failed (${status}).`);
          return;
        }

        setProgress(true, describeStatus(status));
        pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        setGenerating(false);
        setProgress(false);
        showError(err.message || 'Lost connection while checking status.');
      }
    };

    pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
  }

  function describeStatus(status) {
    switch (status) {
      case 'PENDING':
        return 'Queued…';
      case 'TEXT_SUCCESS':
        return 'Lyrics ready — generating audio…';
      case 'FIRST_SUCCESS':
        return 'First track ready — finishing the rest…';
      default:
        return 'Working…';
    }
  }

  function setGenerating(isGenerating) {
    generateBtn.disabled = isGenerating;
    generateBtn.textContent = isGenerating ? 'Generating…' : 'Generate music';
  }

  function setProgress(show, text) {
    progressBox.hidden = !show;
    if (text) progressText.textContent = text;
  }

  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = false;
  }
  function hideError() {
    errorBox.hidden = true;
  }

  // ---------- Results / history ----------
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  }

  function renderTracks(sunoData, status) {
    const history = loadHistory();

    sunoData.forEach((track) => {
      if (renderedIds.has(track.id)) return;
      renderedIds.add(track.id);

      const entry = {
        id: track.id,
        title: track.title || 'Untitled',
        tags: track.tags || '',
        audioUrl: track.audio_url || track.stream_audio_url || '',
        imageUrl: track.image_url || '',
        duration: track.duration || null,
        createdAt: track.createTime || new Date().toISOString(),
      };

      history.unshift(entry);
      addTrackCard(entry, status === 'SUCCESS' ? 'Ready' : 'Rendering…');
    });

    saveHistory(history);
  }

  function addTrackCard(entry, badgeText) {
    emptyState.style.display = 'none';

    const node = trackCardTemplate.content.cloneNode(true);
    const card = node.querySelector('.track-card');
    card.dataset.id = entry.id;

    const img = node.querySelector('.track-img');
    if (entry.imageUrl) img.src = entry.imageUrl;
    img.alt = entry.title;

    node.querySelector('.track-status-badge').textContent = badgeText || 'Ready';
    node.querySelector('.track-title').textContent = entry.title;
    node.querySelector('.track-tags').textContent = entry.tags || '';

    const audio = node.querySelector('.track-audio');
    if (entry.audioUrl) audio.src = entry.audioUrl;

    const download = node.querySelector('.track-download');
    if (entry.audioUrl) {
      download.href = entry.audioUrl;
      download.setAttribute('download', `${sanitizeFilename(entry.title)}.mp3`);
    } else {
      download.style.display = 'none';
    }

    node.querySelector('.track-remove').addEventListener('click', () => {
      removeTrack(entry.id);
      card.remove();
      if (!trackGrid.querySelector('.track-card')) emptyState.style.display = '';
    });

    trackGrid.prepend(node);
  }

  function removeTrack(id) {
    const history = loadHistory().filter((t) => t.id !== id);
    saveHistory(history);
  }

  function sanitizeFilename(name) {
    return (name || 'track').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60);
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (!confirm('Remove all tracks from this list? (Files on Suno are not deleted.)')) return;
    saveHistory([]);
    trackGrid.querySelectorAll('.track-card').forEach((c) => c.remove());
    emptyState.style.display = '';
  });

  // Initial render from local history
  (function init() {
    const history = loadHistory();
    if (history.length) {
      history.forEach((entry) => {
        renderedIds.add(entry.id);
        addTrackCard(entry, 'Ready');
      });
    }
  })();
})();
