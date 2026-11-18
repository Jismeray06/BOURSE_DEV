#!/usr/bin/env bash
# Lance le backend (NestJS, port 3001) et le frontend (Next.js, port 3000) avec une seule commande.
# Usage : ./dev.sh        Arrêt : Ctrl+C (arrête les deux).

cd "$(dirname "$0")" || exit 1

BLEU=$'\033[34m'; VERT=$'\033[32m'; ROUGE=$'\033[31m'; FIN=$'\033[0m'

for dossier in backend frontend; do
  if [ ! -d "$dossier/node_modules" ]; then
    echo "${ROUGE}Les dépendances de $dossier ne sont pas installées. Lance : (cd $dossier && npm install)${FIN}"
    exit 1
  fi
done

# Les ports doivent être libres (sinon un ancien lancement tourne encore).
for port in 3000 3001; do
  if (exec 3<>/dev/tcp/127.0.0.1/$port) 2>/dev/null; then
    echo "${ROUGE}Le port $port est déjà utilisé : un backend/frontend tourne peut-être déjà dans un autre terminal.${FIN}"
    exit 1
  fi
done

# La base PostgreSQL (port 5433 d'après la config locale) doit répondre, sinon le backend plante.
if command -v pg_isready >/dev/null 2>&1 && ! pg_isready -q -p 5433; then
  echo "${ROUGE}PostgreSQL ne répond pas sur le port 5433. Démarre-le d'abord, puis relance ./dev.sh.${FIN}"
  exit 1
fi

pgids=()
arreter() {
  trap - INT TERM EXIT
  echo; echo "Arrêt du backend et du frontend…"
  for pgid in "${pgids[@]}"; do kill -- "-$pgid" 2>/dev/null; done
  wait 2>/dev/null
}
trap arreter INT TERM EXIT

set -m  # chaque lancement dans son propre groupe de processus, pour pouvoir tout arrêter proprement
(cd backend && exec npm run start:dev 2>&1 | sed -u "s/^/${BLEU}[backend] ${FIN}/") &
pgids+=($!)
(cd frontend && exec npm run dev 2>&1 | sed -u "s/^/${VERT}[frontend]${FIN} /") &
pgids+=($!)

echo "Backend  : http://localhost:3001"
echo "Frontend : http://localhost:3000   (Ctrl+C pour tout arrêter)"

wait -n  # si l'un des deux s'arrête tout seul, on arrête l'autre aussi
