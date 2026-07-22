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
  downloadWorkspace,
  setCurrentBusinessCode,
  uploadWorkspace,
  workspaceBelongsToUser,
} from '../../firebase/workspaceSafe';
import { loadManagerSetup } from '../../utils/managerDraft';

function readableError(error) {
  const code = error?.code || '';
  if (code.includes('email-already-in-use')) return 'Bu e-posta zaten kayıtlı. Şifre oluştur/sıfırla bağlantısını kullanıp ardından giriş yapın.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'E-posta veya şifre hatalı.';
  if (code.includes('weak-password')) return 'Şifre en az 6 karakter olmalıdır.';
  if (code.includes('invalid-email')) return 'Geçerli bir e-posta adresi yazın.';
  if (code.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';
  if (code.includes('popup-closed-by-user')) return 'Google giriş penceresi tamamlanmadan kapatıldı.';
  if (code.includes('popup-blocked')) return 'Tarayıcı Google giriş penceresini engelledi.';
  if (code.includes('unauthorized-domain')) return 'Bu Vercel alan adı Firebase Authentication için yetkilendirilmemiş.';
  if (code.includes('permission-denied')) return 'Firestore güvenlik kuralları işletme kaydına izin vermedi.';
  return error?.message || 'İşlem tamamlanamadı.';
}

export default function ManagerAccountSecure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setup = useMemo(() => loadManagerSetup(), []);
  const returnPath = searchParams.get('return') || '/panel/yonetici';
  const [mode, setMode] = useState('login');
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [name, setName] = useState(setup.owner.name || 'Murat Aydın');
  const [email, setEmail] = useState(setup.owner.email || 'neseli27@gmail.com');
  const [businessCode, setBusinessCode] = useState(setup.business.code || '');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = observeAuthState((user) => {
        setCurrentUser(user && !user.isAnonymous ? user : null);
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

  function validateBusinessCode() {
    const code = businessCode.trim();
    if (!code) throw new Error('İşletme kodunu yazın.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) throw new Error('İşletme kodu küçük harf, sayı ve tire içermelidir.');
    return code;
  }

  async function openOrAttachWorkspace(user, preferUpload = false) {
    const code = validateBusinessCode();
    const localMatches = setup.completed && setup.business.code === code;

    if (preferUpload) {
      if (!localMatches) throw new Error('Bu tarayıcıdaki işletme kurulumu ile işletme kodu eşleşmiyor.');
      await uploadWorkspace(user, code);
      setCurrentBusinessCode(code);
      return 'Bu tarayıcıdaki işletme, menü, personel ve masa kayıtları hesabınıza bağlandı.';
    }

    try {
      if (await workspaceBelongsToUser(code, user)) {
        await downloadWorkspace(code, user);
        setCurrentBusinessCode(code);
        return 'İşletme kayıtları hesabınızdan yüklendi.';
      }
    } catch (workspaceError) {
      if (!localMatches) throw workspaceError;
    }

    if (localMatches) {
      await uploadWorkspace(user, code);
      setCurrentBusinessCode(code);
      return 'Mevcut işletme kayıtları hesabınıza bağlandı.';
    }

    throw new Error('Bu hesapta belirtilen işletme bulunamadı. İşletme kodunu kontrol edin.');
  }

  async function finish(message) {
    setNotice(message);
    window.setTimeout(() => navigate(returnPath, { replace: true }), 650);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;
    setLoading('login');
    setError('');
    setNotice('');
    try {
      const user = await signInStaff(email, password);
      await finish(await openOrAttachWorkspace(user));
    } catch (loginError) {
      setError(readableError(loginError));
    } finally {
      setLoading('');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (loading) return;
    if (!setup.completed || !setup.business.code) {
      setError('Yeni hesap oluşturmadan önce işletme kurulumunu tamamlayın.');
      return;
    }
    if (businessCode.trim() !== setup.business.code) {
      setError(`Bu tarayıcıdaki işletme kodu “${setup.business.code}”. Hesap bu kodla oluşturulmalıdır.`);
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
      const user = await registerManagerAccount({ email, password, name });
      await finish(await openOrAttachWorkspace(user, true));
    } catch (registerError) {
      setError(readableError(registerError));
    } finally {
      setLoading('');
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setLoading('google');
    setError('');
    setNotice('');
    try {
      const user = await signInStaffWithGoogle();
      setEmail(user.email || email);
      await finish(await openOrAttachWorkspace(user));
    } catch (googleError) {
      setError(readableError(googleError));
    } finally {
      setLoading('');
    }
  }

  async function handleReset() {
    if (loading) return;
    setLoading('reset');
    setError('');
    setNotice('');
    try {
      await sendManagerPasswordReset(email);
      setNotice(`${email.trim()} adresine şifre oluşturma/sıfırlama bağlantısı gönderildi.`);
    } catch (resetError) {
      setError(readableError(resetError));
    } finally {
      setLoading('');
    }
  }

  async function handleSignedInAction(action) {
    if (!currentUser || loading) return;
    setLoading(action);
    setError('');
    setNotice('');
    try {
      if (action === 'download') {
        const code = validateBusinessCode();
        await downloadWorkspace(code, currentUser);
        setCurrentBusinessCode(code);
        await finish('Hesaptaki kayıtlar bu cihaza yüklendi.');
      } else {
        await finish(await openOrAttachWorkspace(currentUser, true));
      }
    } catch (actionError) {
      setError(readableError(actionError));
    } finally {
      setLoading('');
    }
  }

  async function handleLogout() {
    setLoading('logout');
    await signOutStaff().catch(() => {});
    setCurrentUser(null);
    setLoading('');
    setNotice('Hesaptan çıkış yapıldı.');
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h1 className="text-xl font-bold">İşletme hesabı hazırlanıyor</h1>
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
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">İşletme kayıtları kullanıcı adı ve şifreyle sabitlendi.</h1>
          <p className="mt-4 text-sm leading-7 text-emerald-50/75">E-posta adresiniz kullanıcı adıdır. İşletme profili, menü, personel, masalar ve QR güvenlik kodları Firebase hesabınıza kaydedilir.</p>
          <div className="mt-8 space-y-3 text-sm">
            {['Başka cihazdan aynı hesapla erişim', 'Otomatik bulut kaydı', 'İşletme koduyla doğru kayıt seçimi', 'Firebase tarafından güvenli parola yönetimi'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-300 text-xs font-black text-emerald-950">✓</span><span>{item}</span></div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          {currentUser ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Hesap açık</p>
              <h2 className="mt-2 text-3xl font-black">{currentUser.displayName || setup.owner.name || 'İşletme yöneticisi'}</h2>
              <p className="mt-2 text-neutral-400">{currentUser.email}</p>
              <label className="mt-7 block"><span className="text-sm font-semibold">İşletme kodu</span><input value={businessCode} onChange={(event) => setBusinessCode(event.target.value.toLocaleLowerCase('tr-TR'))} className={inputClass} /></label>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button onClick={() => handleSignedInAction('download')} disabled={Boolean(loading)} className="rounded-2xl bg-emerald-600 px-5 py-3.5 font-bold disabled:opacity-50">{loading === 'download' ? 'Yükleniyor…' : 'Hesaptaki kayıtları aç'}</button>
                <button onClick={() => handleSignedInAction('upload')} disabled={Boolean(loading)} className="rounded-2xl bg-neutral-700 px-5 py-3.5 font-bold disabled:opacity-50">{loading === 'upload' ? 'Kaydediliyor…' : 'Bu cihazdakileri kaydet'}</button>
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
                {mode === 'register' && <label className="block"><span className="text-sm font-semibold">Ad soyad</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>}
                <label className="block"><span className="text-sm font-semibold">İşletme kodu</span><input value={businessCode} onChange={(event) => setBusinessCode(event.target.value.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-'))} className={inputClass} autoCapitalize="none" /><span className="mt-2 block text-xs text-neutral-500">Bu tarayıcıdaki kod: {setup.business.code || 'henüz yok'}</span></label>
                <label className="block"><span className="text-sm font-semibold">E-posta — kullanıcı adı</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} autoComplete="email" /></label>
                <label className="block"><span className="text-sm font-semibold">Şifre</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
                {mode === 'register' && <label className="block"><span className="text-sm font-semibold">Şifre tekrar</span><input type="password" value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} className={inputClass} minLength={6} autoComplete="new-password" /></label>}
                {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">{error}</div>}
                {notice && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">{notice}</div>}
                <button disabled={Boolean(loading)} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-bold disabled:opacity-50">{loading === 'login' ? 'Giriş yapılıyor…' : loading === 'register' ? 'Hesap oluşturuluyor…' : mode === 'login' ? 'İşletme hesabına giriş yap' : 'Hesabı oluştur ve kayıtları bağla'}</button>
              </form>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleReset} disabled={Boolean(loading)} className="rounded-2xl bg-neutral-800 px-4 py-3 text-sm font-semibold disabled:opacity-50">{loading === 'reset' ? 'Gönderiliyor…' : 'Şifre oluştur / sıfırla'}</button>
                <button type="button" onClick={handleGoogle} disabled={Boolean(loading)} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-neutral-900 disabled:opacity-50">{loading === 'google' ? 'Google açılıyor…' : 'Google hesabıyla doğrula'}</button>
              </div>
            </div>
          )}

          {currentUser && error && <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          {currentUser && notice && <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}
        </section>
      </div>
    </div>
  );
}
