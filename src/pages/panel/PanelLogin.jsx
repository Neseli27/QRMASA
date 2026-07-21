import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInStaff, signOutStaff } from '../../firebase/auth';
import { getStaffAccess } from '../../firebase/staff';

function readableAuthError(error) {
  const code = error?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (code.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';
  return error?.message || 'Giriş yapılamadı.';
}

export default function PanelLogin() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState(() => localStorage.getItem('qrmasa_staff_business') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const normalizedBusinessId = businessId.trim();
    setLoading(true);
    setError('');

    try {
      const user = await signInStaff(email, password);
      await getStaffAccess(normalizedBusinessId, user);
      localStorage.setItem('qrmasa_staff_business', normalizedBusinessId);
      navigate(`/panel/garson?business=${encodeURIComponent(normalizedBusinessId)}`, { replace: true });
    } catch (loginError) {
      await signOutStaff().catch(() => {});
      setError(readableAuthError(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900 p-7 shadow-2xl">
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
            placeholder="Örneğin: antep-evi-p7th"
            autoCapitalize="none"
            autoCorrect="off"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">E-posta</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="personel@isletme.com"
            autoComplete="email"
            required
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
            required
            minLength={6}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </label>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}

        <button disabled={loading} className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 font-bold disabled:cursor-wait disabled:opacity-60">
          {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </div>
  );
}
