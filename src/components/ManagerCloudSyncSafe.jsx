import { useEffect, useRef } from 'react';
import { observeAuthState } from '../firebase/auth';
import { isCloudHydrating, uploadWorkspace } from '../firebase/workspaceSafe';
import { notifyCloudStatus } from '../utils/draftEvents';

export default function ManagerCloudSyncSafe() {
  const userRef = useRef(null);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const queuedCodeRef = useRef('');

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = observeAuthState((user) => {
        userRef.current = user && !user.isAnonymous ? user : null;
      });
    } catch {
      userRef.current = null;
    }

    async function run() {
      if (runningRef.current || isCloudHydrating()) return;
      const user = userRef.current;
      const code = queuedCodeRef.current;
      if (!user || !code) return;

      runningRef.current = true;
      queuedCodeRef.current = '';
      notifyCloudStatus('syncing', 'Değişiklikler hesabınıza kaydediliyor…');
      try {
        await uploadWorkspace(user, code);
        notifyCloudStatus('saved', 'Değişiklikler hesabınıza kaydedildi.');
      } catch (error) {
        notifyCloudStatus('error', error?.message || 'Bulut kaydı yapılamadı.');
      } finally {
        runningRef.current = false;
        if (queuedCodeRef.current) timerRef.current = window.setTimeout(run, 700);
      }
    }

    function onDraftChanged(event) {
      if (isCloudHydrating()) return;
      const code = String(event?.detail?.businessCode || '').trim();
      if (!code) return;
      queuedCodeRef.current = code;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(run, 900);
    }

    window.addEventListener('qrmasa:draft-changed', onDraftChanged);
    return () => {
      unsubscribe?.();
      window.removeEventListener('qrmasa:draft-changed', onDraftChanged);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
