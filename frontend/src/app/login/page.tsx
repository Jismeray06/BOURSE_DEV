'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { dashboardPathForRole } from '../../components/dashboardPath';
import { useHomeTheme } from '../../components/HomeThemeToggle';
import { HeroGlow } from '../../components/home/HeroExtras';
import { HomeNavbar } from '../../components/home/HomeNavbar';
import { AwaitingEmailVerification } from '../../components/AwaitingEmailVerification';
import { useLanguage } from '../../components/home/language';
import { loginT, translateServerMessage } from '../../components/home/login-translations';
import { defaultSiteSettings, fetchSiteSettings, type SiteSettings } from '../../components/siteSettings';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const googleAuthUrl = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ?? `${apiUrl}/auth/google`;

type ApiError = { message?: string | string[] };
type UserRole = 'ETUDIANT' | 'ADMIN' | 'ETABLISSEMENT' | 'ADMIN_ETABLISSEMENT' | 'SECRETAIRE' | 'SCOLARITE_CENTRALE' | 'SECRETAIRE_SCOLARITE';
type LoginResponse = ApiError & {
  accessToken?: string;
  user?: { id?: string; fullName?: string; email?: string; role?: UserRole };
};

// Champs et boutons : fond blanc en mode clair, effet « verre » sur le fond sombre en mode sombre.
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/90';
const fieldCls = 'w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/25 dark:bg-white/10 dark:text-white dark:backdrop-blur-sm dark:placeholder:text-white/50 dark:focus:border-cyan-300/70 dark:focus:bg-white/15 dark:focus:ring-cyan-300/30';
const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/60';
const eyeCls = 'absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-slate-400 hover:text-slate-700 dark:text-white/60 dark:hover:text-white';
const linkCls = 'cursor-pointer font-medium text-blue-600 hover:underline dark:text-sky-300';

export default function AuthPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useHomeTheme();
  // Langue choisie avec le sélecteur de la barre de navigation (la même que sur l'accueil).
  // Les messages d'erreur sont conservés tels quels et traduits à l'affichage : ils changent de langue avec le sélecteur.
  const language = useLanguage();
  const t = (key: string) => loginT(key, language);
  const shown = (message: string) => translateServerMessage(message, language);
  const [isRegistering, setIsRegistering] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    fetchSiteSettings().then(setSettings).catch(() => undefined);
  }, []);

  // Tant que cette vérification n'est pas faite, on n'affiche pas le formulaire :
  // ça évite qu'un utilisateur déjà connecté voie l'écran de connexion s'afficher
  // brièvement avant d'être redirigé (ex. via le bouton « Page précédente »).
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      const dashboardPath = dashboardPathForRole(sessionStorage.getItem('user_role'));
      if (sessionStorage.getItem('auth_token') && dashboardPath) {
        router.replace(dashboardPath);
        return;
      }
      // Le bouton « Créer mon compte » de l'accueil arrive ici avec ?mode=register.
      if (new URLSearchParams(window.location.search).get('mode') === 'register') setIsRegistering(true);
      setCheckingSession(false);
    };
    checkSession();
  }, [router]);

  // Champs de formulaire
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Visibilité des mots de passe
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour la gestion du chargement et des erreurs
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // Adresse en attente de validation : tant qu'elle est renseignée, la carte affiche l'écran « Vérifiez votre boîte e-mail ».
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationReason, setVerificationReason] = useState<'register' | 'login'>('register');
  // Délai avant de pouvoir renvoyer l'e-mail (secondes) : évite les envois en rafale.
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const resetVerification = () => { setVerificationEmail(''); setCooldown(0); setErrorMsg(''); setSuccessMsg(''); };
  const chooseAnotherAddress = () => { resetVerification(); setPassword(''); setConfirmPassword(''); setIsRegistering(true); };
  const backToLogin = () => { resetVerification(); setPassword(''); setConfirmPassword(''); setIsRegistering(false); };

  // Soumission par Email
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegistering && !fullName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas !');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';

      const payload = isRegistering 
        ? { fullName: fullName.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        // Adresse pas encore vérifiée : on affiche l'écran d'attente plutôt qu'un simple message d'erreur.
        if (message?.includes("n'est pas encore vérifiée")) {
          setVerificationReason('login');
          setVerificationEmail(email.trim());
          setCooldown(0);
          return;
        }
        throw new Error(message || 'Une erreur est survenue.');
      }

      if (isRegistering) {
        setVerificationReason('register');
        setVerificationEmail(email.trim());
        setCooldown(60);
        return;
      }

      if (!data.accessToken || !data.user?.role) {
        throw new Error('Réponse de connexion invalide.');
      }
      sessionStorage.setItem('auth_token', data.accessToken);
      sessionStorage.setItem('user_role', data.user.role);
      sessionStorage.setItem('auth_user', JSON.stringify(data.user));
      router.replace(dashboardPathForRole(data.user.role) ?? '/student');

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!verificationEmail) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch(`${apiUrl}/auth/resend-verification-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: verificationEmail }),
      });
      const data = (await response.json().catch(() => ({}))) as ApiError;
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de renvoyer l’e-mail.');
      setSuccessMsg(typeof data.message === 'string' ? data.message : 'Un nouvel e-mail de vérification a été envoyé.');
      setCooldown(60);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  // Soumission par Google
  const handleGoogleAuth = () => {
    window.location.assign(googleAuthUrl);
  };

  if (checkingSession) {
    return <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950" />;
  }

  return (
    <div className={`flex min-h-screen w-full flex-col bg-slate-100 dark:bg-slate-950 ${darkMode ? 'home-dark' : ''}`}>
      <HomeNavbar
        settings={settings}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onSelectAuth={(mode) => { setIsRegistering(mode === 'register'); resetVerification(); }}
      />

      {/* Fond plein écran. Mode clair : blanc légèrement bleuté avec décor pâle, comme l'accueil.
          Mode sombre : photo du campus assombrie, halo bleu-vert et points lumineux. */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white via-sky-50/70 to-white px-5 py-10 sm:px-6 dark:bg-[#06233b] dark:bg-none">
        <div className="absolute inset-0 hidden dark:block">
          <Image
            src="/images/campus-2.jpg"
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#06233b]/65" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06233b]/80 via-[#0b4a5e]/35 to-[#06233b]/85" />
        </div>
        <HeroGlow />

        {/* --- Carte de connexion / inscription (blanche en mode clair, verre dépoli en mode sombre) --- */}
        <div className="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl shadow-sky-900/10 sm:p-8 dark:border-white/25 dark:bg-[#0a2a3f]/55 dark:text-white dark:shadow-2xl dark:shadow-black/40 dark:backdrop-blur-xl">
          {verificationEmail ? (
            <AwaitingEmailVerification
              email={verificationEmail}
              reason={verificationReason}
              loading={loading}
              cooldown={cooldown}
              message={shown(successMsg)}
              error={shown(errorMsg)}
              onResend={() => void resendVerificationEmail()}
              onChangeAddress={chooseAnotherAddress}
              onBackToLogin={backToLogin}
            />
          ) : (
          <>
          {/* Titre */}
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#0b2c55] sm:text-4xl dark:text-white">
              {t(isRegistering ? 'title.register' : 'title.login')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
              {t(isRegistering ? 'subtitle.register' : 'subtitle.login')}
            </p>
          </div>

          {/* Message d'erreur s'il y en a un */}
          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100">
              {shown(errorMsg)}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100">
              {shown(successMsg)}
            </div>
          )}

          {/* --- OPTION 1 : Inscription / Connexion avec Email --- */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom complet (visible uniquement à l'inscription) */}
            {isRegistering && (
              <div>
                <label htmlFor="fullName" className={labelCls}>{t('field.fullName')}</label>
                <div className="relative">
                  <UserIcon className={iconCls} />
                  <input id="fullName" type="text" placeholder={t('field.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} required className={fieldCls} />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelCls}>{t('field.email')}</label>
              <div className="relative">
                <Mail className={iconCls} />
                <input id="email" type="email" placeholder={t('field.email')} value={email} onChange={(e) => setEmail(e.target.value)} required className={fieldCls} />
              </div>
            </div>

            {/* Mot de passe avec affichage/masquage */}
            <div>
              <label htmlFor="password" className={labelCls}>{t('field.password')}</label>
              <div className="relative">
                <Lock className={iconCls} />
                <input id="password" type={showPassword ? 'text' : 'password'} placeholder={t('field.password')} value={password} onChange={(e) => setPassword(e.target.value)} required className={`${fieldCls} pr-10`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t(showPassword ? 'password.hide' : 'password.show')}
                  className={eyeCls}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirmation Mot de passe (visible uniquement à l'inscription) */}
            {isRegistering && (
              <div>
                <label htmlFor="confirmPassword" className={labelCls}>{t('field.confirmPassword')}</label>
                <div className="relative">
                  <Lock className={iconCls} />
                  <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder={t('field.confirmPassword')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={`${fieldCls} pr-10`} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={t(showConfirmPassword ? 'confirm.hide' : 'confirm.show')}
                    className={eyeCls}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Option Se souvenir de moi (visible uniquement à la connexion) */}
            {!isRegistering && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 bg-white accent-blue-600 focus:ring-0 dark:border-white/40 dark:bg-white/10"
                />
                <label htmlFor="remember" className="cursor-pointer select-none text-sm text-slate-700 dark:text-slate-100">
                  {t('remember')}
                </label>
              </div>
            )}

            {/* Bouton d'action par Email */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-full bg-blue-600 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition hover:bg-blue-500 disabled:opacity-50 dark:shadow-[0_0_24px_rgba(37,99,235,0.5)]"
            >
              {t(loading ? 'submit.loading' : isRegistering ? 'submit.register' : 'submit.login')}
            </button>
          </form>

          {/* Séparateur « OU » */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/20" />
            <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-white/60">{t('or')}</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/20" />
          </div>

          {/* --- OPTION 2 : Inscription / Connexion via Google --- */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/30 dark:bg-white/5 dark:text-white dark:backdrop-blur-sm dark:hover:bg-white/15"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>
              {t(isRegistering ? 'google.register' : 'google.login')}
            </span>
          </button>

          {/* Bascule Connexion / Inscription, en bas du formulaire */}
          <p className="border-t border-slate-200 pt-4 text-center text-sm text-slate-600 dark:border-white/15 dark:text-slate-200">
            {isRegistering ? (
              <>
                {t('switch.haveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }}
                  className={linkCls}
                >
                  {t('switch.login')}
                </button>
              </>
            ) : (
              <>
                {t('switch.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }}
                  className={linkCls}
                >
                  {t('switch.register')}
                </button>
              </>
            )}
          </p>
          </>
          )}
        </div>
      </main>
    </div>
  );
}
