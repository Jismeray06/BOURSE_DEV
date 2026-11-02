// Session unique par navigateur, partagée entre tous les onglets de la plateforme.
//
// Principe : le jeton reste dans le sessionStorage de chaque onglet (jamais dans le localStorage ni dans un cookie lisible, comme
// l'exige déjà un test de sécurité). Les onglets se le transmettent entre eux avec un BroadcastChannel, limité à la même origine.
// Un « marqueur » sans secret (identifiant, rôle et numéro de session) est inscrit dans le localStorage : il dit quel compte est
// actif et sert de filet de sécurité pour un onglet endormi ou qui aurait manqué un message.
//
//  - connexion : la nouvelle session remplace l'ancienne dans tous les onglets ;
//  - déconnexion : elle s'applique à tous les onglets ;
//  - nouvel onglet : il récupère la session auprès des onglets déjà ouverts ;
//  - navigateur fermé puis rouvert : plus aucun onglet ne détient le jeton, donc plus de session (comportement inchangé).

export type Session = { token: string; role: string; user: string; nonce: string };
export type SessionChange = { kind: 'logout' } | { kind: 'session'; role: string; sameAccount: boolean };

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'user_role';
const USER_KEY = 'auth_user';
const NONCE_KEY = 'auth_nonce';
const MARKER_KEY = 'auth_session_marker';
const CHANNEL_NAME = 'bourse-auth-session';
// Événement local : l'état de session de cet onglet vient de changer (affichage de la barre de navigation, par exemple).
export const SESSION_EVENT = 'auth-session-change';

type Marker = { id: string; role: string; nonce: string };
type Message =
  | { type: 'session'; session: Session }
  | { type: 'logout' }
  | { type: 'request'; from: string }
  | { type: 'offer'; to: string; session: Session };

const randomId = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const tabId = typeof crypto === 'undefined' ? 'tab' : randomId();
let channel: BroadcastChannel | null | undefined;

function getChannel() {
  if (channel !== undefined) return channel;
  try {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
  }
  return channel;
}

const post = (message: Message) => {
  try { getChannel()?.postMessage(message); } catch { /* canal indisponible */ }
};
const notifyLocal = () => window.dispatchEvent(new Event(SESSION_EVENT));

export function readSession(): Session | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const role = sessionStorage.getItem(ROLE_KEY);
    if (!token || !role) return null;
    return { token, role, user: sessionStorage.getItem(USER_KEY) ?? '', nonce: sessionStorage.getItem(NONCE_KEY) ?? '' };
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  try {
    sessionStorage.setItem(TOKEN_KEY, session.token);
    sessionStorage.setItem(ROLE_KEY, session.role);
    sessionStorage.setItem(USER_KEY, session.user);
    sessionStorage.setItem(NONCE_KEY, session.nonce);
  } catch { /* stockage indisponible */ }
}

// Efface la session de cet onglet seulement (sans prévenir les autres).
function clearLocalSession() {
  try { sessionStorage.clear(); } catch { /* stockage indisponible */ }
  notifyLocal();
}

// Le partage entre onglets repose sur le localStorage : s'il est bloqué par le navigateur, chaque onglet garde simplement sa propre
// session (comportement d'avant) plutôt que de se déconnecter à cause d'un marqueur impossible à écrire.
let markerSupported: boolean | undefined;
function markerAvailable() {
  if (markerSupported !== undefined) return markerSupported;
  try {
    localStorage.setItem('auth_probe', '1');
    localStorage.removeItem('auth_probe');
    markerSupported = true;
  } catch {
    markerSupported = false;
  }
  return markerSupported;
}

function readMarker(): Marker | null {
  try {
    const raw = localStorage.getItem(MARKER_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw) as Partial<Marker>;
    return typeof marker.nonce === 'string' ? { id: String(marker.id ?? ''), role: String(marker.role ?? ''), nonce: marker.nonce } : null;
  } catch {
    return null;
  }
}

const accountId = (session: Session) => {
  try { return String((JSON.parse(session.user) as { id?: unknown }).id ?? ''); } catch { return ''; }
};

// Ouvre une session (connexion classique ou Google) : elle remplace celle des autres onglets.
export function startSession(data: { accessToken: string; user: { id?: string; role?: string } & Record<string, unknown> }) {
  const session: Session = { token: data.accessToken, role: String(data.user.role ?? ''), user: JSON.stringify(data.user), nonce: randomId() };
  writeSession(session);
  try { localStorage.setItem(MARKER_KEY, JSON.stringify({ id: data.user.id ?? '', role: session.role, nonce: session.nonce })); } catch { /* stockage indisponible */ }
  post({ type: 'session', session });
  notifyLocal();
}

// Ferme la session dans tous les onglets (déconnexion, session expirée ou refusée par le serveur).
export function endSession() {
  const mine = readSession();
  const marker = readMarker();
  // Un onglet resté sur un ancien compte ne doit pas déconnecter le compte actuel : il s'efface seul.
  if (mine?.nonce && marker && marker.nonce !== mine.nonce) {
    clearLocalSession();
    return;
  }
  clearLocalSession();
  try { localStorage.removeItem(MARKER_KEY); } catch { /* stockage indisponible */ }
  post({ type: 'logout' });
}

// Demande la session aux autres onglets ouverts ; null si aucun ne répond dans le délai.
function requestSession(timeoutMs: number): Promise<Session | null> {
  const bc = getChannel();
  if (!bc) return Promise.resolve(null);
  return new Promise((resolve) => {
    const finish = (session: Session | null) => {
      window.clearTimeout(timer);
      bc.removeEventListener('message', onMessage);
      resolve(session);
    };
    const onMessage = (event: MessageEvent<Message>) => {
      const message = event.data;
      if (message?.type === 'offer' && message.to === tabId) finish(message.session);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    bc.addEventListener('message', onMessage);
    post({ type: 'request', from: tabId });
  });
}

// À l'ouverture d'un onglet : retrouve la session du navigateur auprès des autres onglets, ou constate qu'il n'y en a pas.
// Renvoie true si cet onglet dispose d'une session valide.
export async function bootstrapSession(): Promise<boolean> {
  if (!markerAvailable()) return readSession() !== null;
  const marker = readMarker();
  const mine = readSession();
  if (mine) {
    if (marker && marker.nonce === mine.nonce) return true;
    // Un autre compte s'est connecté depuis, ou la session a été fermée ailleurs : on ne garde jamais l'ancienne.
    if (marker) {
      const offered = await requestSession(500);
      if (offered && offered.nonce === marker.nonce) {
        writeSession(offered);
        notifyLocal();
        return true;
      }
    }
    clearLocalSession();
    return false;
  }
  if (!marker) return false;
  const offered = await requestSession(500);
  if (offered && offered.nonce === marker.nonce) {
    writeSession(offered);
    notifyLocal();
    return true;
  }
  // Personne ne détient plus la session (navigateur redémarré, onglets fermés) : le marqueur reste, il sera remplacé à la prochaine connexion.
  return false;
}

// Écoute les changements venus des autres onglets : connexion avec un autre compte, déconnexion, demandes de session.
export function subscribeToSessionChanges(onChange: (change: SessionChange) => void) {
  const bc = getChannel();

  const adopt = (incoming: Session) => {
    const current = readSession();
    if (current && current.nonce === incoming.nonce) return;
    const sameAccount = Boolean(current) && current!.role === incoming.role && accountId(current!) !== '' && accountId(current!) === accountId(incoming);
    writeSession(incoming);
    notifyLocal();
    onChange({ kind: 'session', role: incoming.role, sameAccount });
  };

  const dropSession = () => {
    if (!readSession()) return;
    clearLocalSession();
    onChange({ kind: 'logout' });
  };

  const onMessage = (event: MessageEvent<Message>) => {
    const message = event.data;
    if (!message) return;
    if (message.type === 'session') adopt(message.session);
    else if (message.type === 'logout') dropSession();
    else if (message.type === 'request') {
      const mine = readSession();
      const marker = readMarker();
      if (mine && marker && marker.nonce === mine.nonce) post({ type: 'offer', to: message.from, session: mine });
    }
  };

  // Filet de sécurité : compare la session de cet onglet au marqueur partagé (onglet endormi, message manqué).
  const reconcile = async () => {
    const mine = readSession();
    if (!mine || !markerAvailable()) return;
    const marker = readMarker();
    if (!marker) { dropSession(); return; }
    if (marker.nonce === mine.nonce) return;
    const offered = await requestSession(500);
    const latest = readMarker();
    if (offered && latest && offered.nonce === latest.nonce) { adopt(offered); return; }
    const now = readSession();
    if (now && latest && now.nonce === latest.nonce) return; // le message de connexion est arrivé entre-temps
    dropSession(); // le compte a changé et sa session est introuvable : cet onglet ne garde pas l'ancien compte
  };

  const onStorage = (event: StorageEvent) => { if (event.key === MARKER_KEY) void reconcile(); };
  const onVisibility = () => { if (document.visibilityState === 'visible') void reconcile(); };

  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
