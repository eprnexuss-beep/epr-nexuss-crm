import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import { LOGOUT_SUCCESS } from '@/redux/auth/types';
import { accountApi } from '@/utils/crmApi';

function issuedAt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return typeof payload.iat === 'number' ? payload.iat * 1000 : null;
  } catch { return null; }
}

export default function useSessionGuard() {
  const dispatch = useDispatch();
  const { current, isLoggedIn } = useSelector(selectAuth);
  const token = current?.token;
  useEffect(() => {
    if (!isLoggedIn || !token) return undefined;
    let active = true;
    let checking = false;
    const forceLogout = () => {
      if (!active) return;
      let stored;
      try { stored = JSON.parse(localStorage.getItem('auth') || 'null'); } catch { stored = null; }
      if (stored?.current?.token && stored.current.token !== token) return;
      localStorage.removeItem('auth');
      localStorage.setItem('isLogout', JSON.stringify({ isLogout: true }));
      dispatch({ type: LOGOUT_SUCCESS });
    };
    const start = issuedAt(token);
    if (start === null) { forceLogout(); return undefined; }
    const remaining = start + 60 * 60 * 1000 - Date.now();
    if (remaining <= 0) { forceLogout(); return undefined; }
    const timeout = setTimeout(forceLogout, remaining);
    const check = async () => {
      if (checking || !active) return;
      checking = true;
      try { await accountApi.get('session/check', { headers: { Authorization: `Bearer ${token}` } }); }
      catch (error) { if (error.response?.status === 401) forceLogout(); }
      finally { checking = false; }
    };
    const storage = event => {
      if (event.key !== 'auth') return;
      let next;
      try { next = JSON.parse(event.newValue || 'null'); } catch { next = null; }
      if (!next?.current?.token || next.current.token !== token) window.location.reload();
    };
    const onFocus = () => { if (Date.now() >= start + 3600000) forceLogout(); else check(); };
    const interval = setInterval(check, 15000);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', onFocus);
    check();
    return () => { active = false; clearTimeout(timeout); clearInterval(interval); window.removeEventListener('storage', storage); window.removeEventListener('focus', onFocus); };
  }, [dispatch, isLoggedIn, token]);
}
