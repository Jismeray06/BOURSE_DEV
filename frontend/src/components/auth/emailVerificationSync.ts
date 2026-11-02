// Liaison entre l'onglet ouvert par le lien de l'e-mail et l'onglet qui attend la vérification de l'adresse.
//
// L'onglet du lien confirme l'adresse auprès du serveur (jeton à usage unique, inchangé), puis le signale ici. L'onglet d'attente,
// s'il existe dans ce navigateur, le confirme en retour (« ack ») : l'onglet du lien sait alors qu'il peut se limiter à un message.
// Aucun secret ne circule sur ce canal, limité à la même origine.

const CHANNEL_NAME = 'bourse-email-verification';

type Message = { type: 'verified' } | { type: 'ack' };

const open = () => {
  try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME); } catch { return null; }
};

// Côté onglet du lien : prévient les onglets en attente. Renvoie true si l'un d'eux a répondu.
export function announceEmailVerified(timeoutMs = 1200): Promise<boolean> {
  const bc = open();
  if (!bc) return Promise.resolve(false);
  return new Promise((resolve) => {
    const finish = (acknowledged: boolean) => {
      window.clearTimeout(timer);
      bc.close();
      resolve(acknowledged);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    bc.onmessage = (event: MessageEvent<Message>) => { if (event.data?.type === 'ack') finish(true); };
    bc.postMessage({ type: 'verified' } satisfies Message);
  });
}

// Côté onglet d'attente : appelle onVerified quand un autre onglet vient de vérifier une adresse. Renvoie la fonction d'arrêt.
export function watchEmailVerified(onVerified: () => void): () => void {
  const bc = open();
  if (!bc) return () => undefined;
  bc.onmessage = (event: MessageEvent<Message>) => {
    if (event.data?.type !== 'verified') return;
    bc.postMessage({ type: 'ack' } satisfies Message);
    onVerified();
  };
  return () => bc.close();
}
