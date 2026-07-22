import { useEffect, useRef } from 'react';
import { observeAuthState } from '../firebase/auth';
import { isCloudHydrating, uploadCurrentWorkspace } from '../firebase/workspace';
import { notifyCloudStatus } from '../utils/draftEvents';

export default function ManagerCloudSync() {
  const userRef = useRef(null);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const queuedBusinessCodeRef = useRef('');

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = observeAuthState((user) => {
        userRef.current = user && !user.isAnonymous ? user : null;
      });
    } catch {
      userRef.current = null;
    }

    async function runSync() {
      if (runningRef.current || isCloudHydrating()) return;
      const user = userRef.current;
      const businessCode = queuedBusinessCodeRef.current;
      if (!user || !businessCode) return;

      runningRef.current = true;
      queuedBusinessCodeRef.current = '';
      notifyCloudStatus('syncing', 'Değişiklikler buluta kaydediliyor…');

      try {
        await uploadCurrentWorkspace(user, businessCode);
        notifyCloudStatus('saved', 'Değişiklikler hesabınıza kaydedildi.');
      } catch (error) {
        notifyCloudStatus('error', error?.message || 'Bulut kaydı yapılamadı.');
      } finally {
        runningRef.current = false;
        if (queuedBusinessCodeRef.current) {
          timerRef.current = window.setTimeout(runSync, 600);
        }
      }
    }

    function handleDraftChanged(event) {
      if (isCloudHydrating()) return;
      const businessCode = String(event?.detail?.businessCode || '').trim();
      if (!businessCode) return;
      queuedBusinessCodeRef.current = businessCode;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(runSync, 900);
    }

    window.addEventListener('qrmasa:draft-changed', handleDraftChanged);
    return () => {
      unsubscribe?.();
      window.removeEventListener('qrmasa:draft-changed', handleDraftChanged);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
