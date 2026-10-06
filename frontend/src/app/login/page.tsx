'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, GraduationCap, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { dashboardPathForRole } from '../../components/dashboardPath';
import { HomeThemeToggle, useHomeTheme } from '../../components/HomeThemeToggle';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const googleAuthUrl = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ?? `${apiUrl}/auth/google`;

type ApiError = { message?: string | string[] };
type UserRole = 'ETUDIANT' | 'ADMIN' | 'ETABLISSEMENT' | 'ADMIN_ETABLISSEMENT' | 'SECRETAIRE' | 'SCOLARITE_CENTRALE';
type LoginResponse = ApiError & {
  accessToken?: string;
  user?: { id?: string; fullName?: string; email?: string; role?: UserRole };
};

export default function AuthPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useHomeTheme();
  const [isRegistering, setIsRegistering] = useState(false);

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
  const [verificationEmail, setVerificationEmail] = useState('');

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
        if (message?.includes("n'est pas encore vérifiée")) setVerificationEmail(email.trim());
        throw new Error(message || 'Une erreur est survenue.');
      }

      if (isRegistering) {
        setVerificationEmail(email.trim());
        setSuccessMsg(typeof data.message === 'string' ? data.message : 'Compte créé. Consultez votre boîte e-mail pour vérifier votre adresse.');
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
    <div className={`min-h-screen w-full bg-slate-100 dark:bg-slate-950 ${darkMode ? 'home-dark' : ''}`}>
      {/* Écran plein : panneau décoratif + formulaire */}
      <div className="flex min-h-screen w-full flex-col overflow-hidden bg-white dark:bg-slate-950 md:flex-row">

        {/* --- Panneau gauche décoratif (masqué sur mobile) --- */}
        <div className="relative hidden min-h-screen overflow-hidden md:flex md:w-1/2 md:flex-col md:justify-end px-10 pb-16 lg:px-16">
          <Image
            src="/images/campus-2.jpg"
            alt="Étudiants de l'Université de Mahajanga"
            fill
            sizes="50vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06233b]/95 via-[#0b3b60]/60 to-[#0b3b60]/20" />

          {/* Texte de bienvenue */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-medium text-amber-200 backdrop-blur-sm mb-5">
              <GraduationCap className="w-4 h-4" />
              <span>Université de Mahajanga</span>
            </div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white leading-snug max-w-sm">
              {isRegistering ? 'Rejoignez la communauté étudiante' : 'Content de vous revoir'}
            </h2>
            <p className="text-sm text-slate-200 mt-3 leading-relaxed max-w-xs">
              {isRegistering
                ? "Créez votre compte pour déposer votre dossier d'inscription et suivre chaque étape depuis chez vous."
                : "Retrouvez votre dossier, vos documents et l'avancement de votre inscription en un instant."}
            </p>
          </div>
        </div>

        {/* --- Panneau droit : formulaire --- */}
        <div className="relative flex min-h-screen w-full items-center justify-center px-6 py-10 sm:px-12 lg:px-20 md:w-1/2">
          <HomeThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="absolute right-4 top-4 z-20" />
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:p-8">

          {/* Retour à l'accueil */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-[#0b3b60] dark:hover:text-blue-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>

          {/* Titre et bascule Mode Inscription / Connexion */}
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {isRegistering ? 'Créer un compte' : 'Heureux de vous revoir'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isRegistering ? (
                <>
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(false); setErrorMsg(''); }}
                    className="text-[#0b3b60] dark:text-blue-300 hover:underline font-medium cursor-pointer"
                  >
                    Se connecter
                  </button>
                </>
              ) : (
                <>
                  ou{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(true); setErrorMsg(''); }}
                    className="text-[#0b3b60] dark:text-blue-300 hover:underline font-medium cursor-pointer"
                  >
                    créer un compte
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Message d'erreur s'il y en a un */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 text-xs rounded-lg font-medium">
              {successMsg}
            </div>
          )}

          {/* --- OPTION 1 : Inscription / Connexion avec Email --- */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom complet (visible uniquement à l'inscription) */}
            {isRegistering && (
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-blue-500/40 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-blue-500/40 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-all"
              />
            </div>

            {/* Mot de passe avec affichage/masquage */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-blue-500/40 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirmation Mot de passe (visible uniquement à l'inscription) */}
            {isRegistering && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-blue-500/40 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                  className="w-4 h-4 text-[#0b3b60] border-slate-300 rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Se souvenir de moi
                </label>
              </div>
            )}

            {/* Bouton d'action par Email */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0b3b60] hover:bg-[#0a3255] text-white font-semibold text-sm rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm shadow-[#0b3b60]/30"
            >
              {loading
                ? 'Traitement en cours...'
                : isRegistering ? 'Créer mon compte' : 'Se connecter'
              }
            </button>
          </form>

          {verificationEmail && (
            <button type="button" onClick={() => void resendVerificationEmail()} disabled={loading} className="text-sm text-[#0b3b60] dark:text-blue-300 hover:underline cursor-pointer disabled:opacity-50">
              Renvoyer l&apos;e-mail de vérification
            </button>
          )}

          {/* Séparateur « OU » */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
            <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider absolute">
              ou
            </span>
          </div>

          {/* --- OPTION 2 : Inscription / Connexion via Google --- */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-xl flex items-center justify-center gap-3 transition cursor-pointer shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>
              {isRegistering ? 'Créer un compte avec Google' : 'Se connecter avec Google'}
            </span>
          </button>

          {/* Mot de passe oublié (Connexion uniquement) */}
          {!isRegistering ? (
            <div className="text-left pt-1">
              <button
                type="button"
                onClick={() => setErrorMsg('Contactez le service de scolarité pour réinitialiser votre mot de passe.')}
                className="text-sm text-[#0b3b60] dark:text-blue-300 hover:underline cursor-pointer"
              >
                Mot de passe oublié ?
              </button>
            </div>
          ) : null}

          </div>

        </div>
      </div>
    </div>
  );
}