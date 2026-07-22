import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInStaff, signInStaffWithGoogle, signOutStaff } from '../../firebase/auth';
import { getStaffAccess } from '../../firebase/staff';

function readableAuthError(error) {
  const code = error?.code || '';

  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (code.includes('permission-denied')) {
    return 'Bu hesap işletme kaydını okumaya yetkili değil. İşletme sahibiyseniz önce işletme hesabı ekranından kayıtları hesabınıza bağlayın.';
  }
  if (code.includes('popup-closed-by-user')) return 'Google giriş penceresi tamamlanmadan kapatıldı.';
  if (code.includes('popup-blocked')) return 'Tarayıcı Google giriş penceresini engelledi. Açılır pencerelere izin verin.';
  if (code.includes('unauthorized-domain')) return 'Bu internet adresi Firebase Authentication için yetkilendirilmemiş.';
  if (code.includes('account-exists-with-different-credential')) {
    return 'Bu e-posta farklı bir giriş yöntemiyle kayıtlı. Hesabın mevcut giriş yöntemini kullanın.';
  }
  if (code.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';
  return error?.message || 'Giriş yapılamadı.';
}

function routeForRole(role, businessId) {
  const query = `?business=${encodeURIComponent(businessId)}`;
  if (role === 'owner' || role === 'manager') return '/panel/yonetici';
  if (role === 'kitchen') return `/panel/mutfak${query}`;
  return `/panel/garson${query}`;
}

export default function PanelLogin() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState(() => localStorage.getItem('qrmasa_staff_business') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingMethod, setLoadingMethod] = useState('');
  const [error, setError] = useState('');

  async function completeStaffLogin(user, normalizedBusinessId) {
    const access = await getStaffAccess(normalizedBusinessId, user);
    localStorage.setItem('qrmasa_staff_business', normalizedBusinessId);
    navigate(routeForRole(access.role, normalizedBusinessId), { replace: true });
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (loadingMethod) return;

    const normalizedBusinessId = businessId.trim();
    if (!normalizedBusinessId) {
      setError('Önce işletme kodunu girin.');
      return;
    }

    setLoadingMethod('email');
    setError('');

    try {
      const user = await signInStaff(email, password);
      await completeStaffLogin(user, normalizedBusinessId);
    } catch (loginError) {
      await signOutStaff().catch(() => {});
      setError(readableAuthError(loginError));
    } finally {
      setLoadingMethod('');
    }
  }

  async function handleGoogleLogin() {
    if (loadingMethod) return;

    const normalizedBusinessId = businessId.trim();
    if (!normalizedBusinessId) {
      setError('Önce işletme kodunu girin.');
      return;
    }

    setLoadingMethod('google');
    setError('');

    try {
      const user = await signInStaffWithGoogle();
      await completeStaffLogin(user, normalizedBusinessId);
    } catch (loginError) {
      await signOutStaff().catch(() => {});
      setError(readableAuthError(loginError));
    } finally {
      setLoadingMethod('');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <form onSubmit={handleEmailSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900 p-7 shadow-2xl">
        <div className="mb-7">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-2xl font-black">Q</div>
          <h1 className="text-3xl font-black">Personel girişi</h1>
          <p className="mt-2 text-sm text-neutral-400">Garson, mutfak ve yönetim ekranlarına güvenli giriş yapın.</p>
        </div>

        <label className="block">
          <span className="text-sm font-semibold">İşletme kodu</span>
          <input
            value={businessId}
            onChange={(event) => setBusinessId(event.target.value)}
            placeholder="Örneğin: murat-kafe"
            autoCapitalize="none"
            autoCorrect="off"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </label>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={Boolean(loadingMethod)}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white py-3.5 font-bold text-neutral-900 disabled:cursor-wait disabled:opacity-60"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-lg font-black text-blue-600">G</span>
          {loadingMethod === 'google' ? 'Google hesabı doğrulanıyor…' : 'Google ile giriş yap'}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-neutral-500">veya e-posta</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <label className="block">
          <span className="text-sm font-semibold">E-posta</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="personel@isletme.com"
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Şifre</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={6}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </label>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}

        <button disabled={Boolean(loadingMethod)} className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 font-bold disabled:cursor-wait disabled:opacity-60">
          {loadingMethod === 'email' ? 'Giriş yapılıyor…' : 'E-posta ve şifreyle giriş yap'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/panel/hesap')}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-neutral-800 py-3 text-sm font-semibold text-neutral-300"
        >
          İşletme sahibi hesabı
        </button>
      </form>
    </div>
  );
}
