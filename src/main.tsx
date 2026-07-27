import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Cross-subdomain session handover MUST complete BEFORE React renders, otherwise
// the route guards (which read localStorage.jwt during render) would see no
// session on the destination subdomain and bounce the user back to /login.
//
// The URL carries only a one-time opaque code (?h=<code>) — never the JWT. We
// exchange it server-side for the real token, store it, and scrub the code from
// the address bar. So the token itself is NEVER visible in the URL / history.
async function primeHandoffToken() {
  try {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('h');
    if (!code) return;

    try {
      const { authAPI } = await import('./services/api');
      const res = await authAPI.consumeHandoff(code);
      const token = res?.data?.token;
      if (token) {
        localStorage.setItem('jwt', token);
      }
    } catch (e) {
      console.error('Handoff code exchange failed', e);
    }

    // Scrub the code from the URL regardless of success.
    queryParams.delete('h');
    const q = queryParams.toString();
    const cleanUrl = window.location.pathname + (q ? `?${q}` : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  } catch (e) {
    console.error('Handoff priming failed', e);
  }
}

primeHandoffToken().finally(() => {
  ReactDOM.createRoot(document.getElementById('app')!).render(
    <App />
  );
});
