import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authGate = document.getElementById('authGate');
const appGate = document.getElementById('appGate');
const authForm = document.getElementById('authForm');
const authEmailInput = document.getElementById('authEmailInput');
const sendLinkBtn = document.getElementById('sendLinkBtn');
const authMessage = document.getElementById('authMessage');
const userBar = document.getElementById('userBar');
const userEmailLabel = document.getElementById('userEmailLabel');
const logoutBtn = document.getElementById('logoutBtn');

function setAuthMessage(text, isError) {
  authMessage.textContent = text;
  authMessage.className = 'inline-message ' + (isError ? 'bad' : 'ok');
}

function showApp(session) {
  authGate.hidden = true;
  appGate.hidden = false;
  userBar.hidden = false;
  userEmailLabel.textContent = session.user.email;
}

function showLogin() {
  authGate.hidden = false;
  appGate.hidden = true;
  userBar.hidden = true;
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmailInput.value.trim();
  if (!email) {
    setAuthMessage('Enter your email first.', true);
    return;
  }

  sendLinkBtn.disabled = true;
  setAuthMessage('Sending…', false);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });

  sendLinkBtn.disabled = false;
  if (error) {
    setAuthMessage(error.message, true);
  } else {
    setAuthMessage(`Check ${email} for a login link.`, false);
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp(session);
    // Strip the magic-link token out of the address bar once it's consumed.
    if (window.location.hash || window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } else {
    showLogin();
  }
});

supabase.auth.getSession().then(({ data }) => {
  if (data.session) showApp(data.session);
  else showLogin();
});
