import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  observeAuthState,
  registerManagerAccount,
  sendManagerPasswordReset,
  signInStaff,
  signInStaffWithGoogle,
  signOutStaff,
} from '../../firebase/auth';
import {
  businessBelongsToUser,
  downloadWorkspaceToLocal,
  setCurrentBusinessCode,
  uploadCurrentWorkspace,
} from '../../firebase/workspace';
import { loadManagerSetup } from '../../utils/managerDraft';

function readableError(error) {
  const code = error?.code || '';
  if (code.includes('email-already-in-use')) {
    return 'Bu e-posta Firebase hesabında zaten kayıtlı. “Şifre oluştur / sıfırla” düğmesiyle bu hesaba parola tanımlayın veya giriş yapın.';
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (code.includes('weak-password')) return 'Şifre en az 6 karakter olmalıdır.';
  if (code.includes('invalid-email')) return 'Geçerli bir e-posta adresi yazın.';
  if (code.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';
  if (code.includes('popup-closed-by-user')) return 'Google giriş penceresi tamamlanmadan kapatıldı.';
  if (code.includes('popup-blocked')) return 'Tarayıcı Google giriş penceresini engelledi.';
  if (code.includes('unauthorized-domain')) return 'Bu Vercel alan adı Firebase Authentication için yetkilendirilmemiş.';
  if (code.includes('permission-denied')) return 'Firestore güvenlik kuralları bu işlemi engelledi.';
  return error?.message || 'İşlem tamamlanamadı.';
}

export default function ManagerAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const localSetup = useMemo(() => loadManagerSetup(), []);
  const returnPath = searchParams.get('return') || '/panel/yonetici';
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [name, setName] = useState(localSetup.owner.name || 'Murat Aydın');
  const [email, setEmail] = useState(localSetup.owner.email || 'neseli27@gmail.com');
  const [businessCode, setBusinessCode] = useState(localSetup.business.code || '');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = observeAuthState((nextUser) => {
        setUser(nextUser && !nextUser.isAnonymous ? nextUser : null);
        setAuthReady(true);
      }, (authError) => {
        setError(readableError(authError));
        setAuthReady(true);
      });
    } catch (authError) {
      setError(readableError(authError));
      setAuthReady(true);
    }
    return () => unsubscribe?.();
  }, []);

  async function finalizeLogin(accountUser, source) {
    const normalizedCode = businessCode.trim();
    if (!normalizedCode) throw new Error('İşletme kodunu yazın.');

    const existsForUser = await businessBelongsToUser(normalizedCode, accountUser).catch((workspaceError) => {
      if (workspaceError?.code === 'permission-denied') throw workspaceError;
      return false;
    });

    if (existsForUser) {
      await downloadWorkspaceToLocal(normalizedCode, accountUser);
      setCurrentBusinessCode(normalizedCode);
      setNotice('İşletme kayıtları hesabınızdan yüklendi.');
      window.setTimeout(() => navigate(returnPath, { replace: true }), 500);
      return;
    }

    if (localSetup.completed && localSetup.business.code === normalizedCode) {
      await uploadCurrentWorkspace(accountUser, normalizedCode);
      setCurrentBusinessCode(normalizedCode);
      setNotice(source === 'register'
        ? 'Hesabınız oluşturuldu ve mevcut işletme kayıtları buluta taşındı.'
        : 'Bu tarayıcıdaki işletme kayıtları hesabınıza bağlandı.');
      window.setTimeout(() => navigate(returnPath, { replace: true }), 650);
      return;
    }

    throw new Error('Bu hesapta belirtilen işletme bulunamadı. İşletme kodunu kontrol edin.');
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;
    setLoading('login');
    setError('');
    setNotice('');
    try {
      const accountUser = await signInStaff(email, password);
      await finalizeLogin(accountUser, 'login');
    } catch (loginError) {
      setError(readableError(loginError));
    } finally {
      setLoading('');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (loading) return;
    if (!localSetup.completed || !localSetup.business.code) {
      setError('Yeni hesap oluşturmadan önce işletme kurulumunu tamamlayın.');
      return;
    }
    if (businessCode.trim() !== localSetup.business.code) {
      setError(`Bu tarayıcıdaki işletme kodu “${localSetup.business.code}”. Hesap bu kodla oluşturulmalıdır.`);
      return;
    }
    if (password !== passwordAgain) {
      setError('Şifreler aynı değil.');
      return;
    }

    setLoading('register');
    setError('');
    setNotice('');
    try {
      const accountUser = await registerManagerAccount({ email, password, name });
      await finalizeLogin(accountUser, 'register');
    } catch (registerError) {
      setError(readableError(registerError));
    } finally {
      setLoading('');
    }
  }

  async function handleGoogleLogin() {
    if (loading) return;
    setLoading('google');
    setError('');
    setNotice('');
    try {
      const accountUser = await signInStaffWithGoogle();
      setEmail(accountUser.email || email);
      await finalizeLogin(accountUser, 'google');
    } catch (googleError) {
      setError(readableError(googleError));
    } finally {
      setLoading('');
    }
  }

  async function handlePasswordReset() {
    if (loading) return;
    setLoading('reset');
    setError('');
    setNotice('');
    try {
      await sendManagerPasswordReset(email);
      setNotice(`${email.trim()} adresine şifre oluşturma/sıfırlama bağlantısı gönderildi. E-postadaki bağlantıdan şifrenizi belirleyip bu ekrana dönün.`);
    } catch (resetError) {
      setError(readableError(resetError));
    } finally {
      setLoading('');
    }
  }

  async function handleLoadCloud() {
    if (!user || loading) return;
    setLoading('load');
    setError('');
    setNotice('');
    try {
      await downloadWorkspaceToLocal(businessCode, user);
      setNotice('İşletme kayıtları buluttan yüklendi.');
      window.setTimeout(() => navigate(returnPath, { replace: true }), 500);
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setLoading('');
    }
  }

  async function handleUploadLocal() {
    if (!user || loading) return;
    setLoading('upload');
    setError('');
    setNotice('');
    try {
      await uploadCurrentWorkspace(user, businessCode);
      setNotice('Bu tarayıcıdaki işletme, menü, personel ve masa kayıtları hesabınıza kaydedildi.');
      window.setTimeout(() => navigate(returnPath, { replace: true }), 650);
    } catch (uploadError) {
      setError(readableError(uploadError));
    } finally {
      setLoading('');
    }
  }

  async function handleLogout() {
    setLoading('logout');
    await signOutStaff().catch(() => {});
    setUser(null);
    setLoading('');
    setNotice('Hesaptan çıkış yapıldı.');
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h1 className="text-xl font-bold">Hesap sistemi hazırlanıyor</h1>
        </div>
      </div>
    );
  }

  const inputClass = 'mt-2 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-neutral-950 p-4 text-white grid place-items-center">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-900 shadow-2xl lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border-b border-white/10 bg-gradient-to-br from-emerald-700 to-neutral-950 p-7 lg:border-b-0 lg:border-r lg:p-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl font-black text-emerald-700">Q</div>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">QRMASA işletme hesabı</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Kayıtlarınız artık tarayıcıya değil, hesabınıza bağlı.</h1>
          <p className="mt-4 text-sm leading-7 text-emerald-50/75">İşletme profili, menü, personel yetkileri, masalar ve QR güvenlik kodları Firebase üzerinde saklanır. Aynı e-posta ve şifreyle başka cihazdan açabilirsiniz.</p>

          <div className="mt-8 space-y-3 text-sm">
            {[
              ['✓', 'E-posta adresiniz kullanıcı adıdır'],
              ['✓', 'İşletme kodu doğru işletmeyi açar'],
              ['✓', 'Değişiklikler otomatik olarak buluta kaydedilir'],
              ['✓', 'Parola Firebase tarafından güvenli biçimde yönetilir'],
            ].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-300 text-xs font-black text-emerald-950">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          {user ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Hesap açık</p>
              <h2 className="mt-2 text-3xl font-black">{user.displayName || localSetup.owner.name || 'İşletme yöneticisi'}</h2>
              <p className="mt-2 text-neutral-400">{user.email}</p>

              <label className="mt-7 block">
                <span className="text-sm font-semibold">İşletme kodu</span>
                <input value={businessCode} onChange={(event) => setBusinessCode(event.target.value.toLocaleLowerCase('tr-TR'))} className={inputClass} placeholder="murat-kafe" />
              </label>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button onClick={handleLoadCloud} disabled={Boolean(loading)} className="rounded-2xl bg-emerald-600 px-5 py-3.5 font-bold disabled:opacity-50">{loading === 'load' ? 'Yükleniyor…' : 'Hesaptaki kayıtları aç'}</button>
                <button onClick={handleUploadLocal} disabled={Boolean(loading)} className="rounded-2xl bg-neutral-700 px-5 py-3.5 font-bold disabled:opacity-50">{loading === 'upload' ? 'Kaydediliyor…' : 'Bu tarayıcıdakileri kaydet'}</button>
              </div>
              <button onClick={handleLogout} disabled={Boolean(loading)} className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-400/10 py-3 text-sm font-semibold text-red-200">Hesaptan çıkış yap</button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 rounded-2xl bg-neutral-800 p-1">
                <button onClick={() => { setMode('login'); setError(''); }} className={`rounded-xl py-3 text-sm font-bold ${mode === 'login' ? 'bg-emerald-600' : 'text-neutral-400'}`}>Giriş yap</button>
                <button onClick={() => { setMode('register'); setError(''); }} className={`rounded-xl py-3 text-sm font-bold ${mode === 'register' ? 'bg-emerald-600' : 'text-neutral-400'}`}>Yeni hesap</button>
              </div>

              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="mt-7 space-y-4">
                {mode === 'register' && (
                  <label className="block">
                    <span className="text-sm font-semibold">Ad soyad</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="İşletme sahibi" />
                  </label>
                )}

                <label className="block">
                  <span className="text-sm font-semibold">İşletme kodu</span>
                  <input value={businessCode} onChange={(event) => setBusinessCode(event.target.value.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-'))} className={inputClass} placeholder="murat-kafe" autoCapitalize="none" />
                  <span className="mt-2 block text-xs text-neutral-500">Kurulumda belirlediğiniz kod. Bu tarayıcıda: {localSetup.business.code || 'henüz yok'}</span>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold">E-posta — kullanıcı adı</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="neseli27@gmail.com" autoComplete="email" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold">Şifre</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                </label>

                {mode === 'register' && (
                  <label className="block">
                    <span className="text-sm font-semibold">Şifre tekrar</span>
                    <input type="password" value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} className={inputClass} minLength={6} autoComplete="new-password" />
                  </label>
                )}

                {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">{error}</div>}
                {notice && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">{notice}</div>}

                <button disabled={Boolean(loading)} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-bold disabled:cursor-wait disabled:opacity-50">
                  {loading === 'login' ? 'Giriş yapılıyor…' : loading === 'register' ? 'Hesap oluşturuluyor…' : mode === 'login' ? 'İşletme hesabına giriş yap' : 'Hesabı oluştur ve kayıtları bağla'}
                </button>
              </form>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handlePasswordReset} disabled={Boolean(loading)} className="rounded-2xl bg-neutral-800 px-4 py-3 text-sm font-semibold disabled:opacity-50">{loading === 'reset' ? 'Gönderiliyor…' : 'Şifre oluştur / sıfırla'}</button>
                <button type="button" onClick={handleGoogleLogin} disabled={Boolean(loading)} className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-neutral-900 disabled:opacity-50">{loading === 'google' ? 'Google açılıyor…' : 'Google hesabıyla doğrula'}</button>
              </div>
            </div>
          )}

          {user && error && <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">{error}</div>}
          {user && notice && <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">{notice}</div>}
        </section>
      </div>
    </div>
  );
}
