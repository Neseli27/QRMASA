import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthActions } from '../../hooks/useAuthActions';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingScreen } from '../../components/ui/StateScreens';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, role } = useAuth();
  const { signInWithEmail, signInWithGoogle, loading, error } = useAuthActions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Hedef sayfa (rol bazlı) - kullanıcı giriş yaparsa buraya yönlendir
  const from = location.state?.from?.pathname;

  // Zaten giriş yapmışsa rolüne göre yönlendir
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    // Kullanıcı var ama henüz profile yüklenmedi (rol bilgisi gelmemiş)
    if (user && !user.isAnonymous && profile === null) return;

    // From varsa oraya git
    if (from) {
      navigate(from, { replace: true });
      return;
    }

    // Role göre default sayfa
    switch (role) {
      case 'superadmin':
        navigate('/superadmin', { replace: true });
        break;
      case 'venue_admin':
        navigate('/yonetim', { replace: true });
        break;
      case 'waiter':
        navigate('/garson', { replace: true });
        break;
      default:
        // Rolü yok — belki yeni kayıt, venue panelini dene (yoksa o sayfa logout yapacak)
        navigate('/yonetim', { replace: true });
    }
  }, [user, profile, role, authLoading, from, navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('E-posta ve şifre gerekli');
      return;
    }
    const { error: err } = await signInWithEmail(email, password);
    if (!err) toast.success('Giriş başarılı');
  };

  const handleGoogleSignIn = async () => {
    const { error: err } = await signInWithGoogle();
    if (!err) toast.success('Giriş başarılı');
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl font-bold text-slate-900 tracking-tight">QRMasa</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xl shadow-slate-200/50 p-8">
          <div className="text-center mb-7">
            <h1 className="font-display text-2xl font-bold text-slate-900 mb-1.5">Hoş Geldiniz</h1>
            <p className="text-sm text-slate-500">İşletme panelinize giriş yapın</p>
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all font-semibold text-slate-700 disabled:opacity-50 active:scale-[0.98]"
          >
            <GoogleIcon />
            Google ile Giriş
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">VEYA</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              label="E-posta"
              type="email"
              icon={Mail}
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Şifre"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
              style={{ backgroundColor: undefined }}
              size="lg"
            >
              Giriş Yap
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-700 transition-colors">
            ← Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
