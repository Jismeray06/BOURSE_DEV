'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const touch = 'max-[1024px]:min-h-[44px]';
const iconButton = 'inline-flex items-center justify-center p-1 max-[1024px]:h-11 max-[1024px]:w-11';

// Clé d'établissement réservée à la liste commune (voir le backend).
const ALL_ESTABLISHMENTS = '*';

type Requirement = { id: string; label: string; active: boolean };

// Pièces que l'étudiant doit téléverser à l'étape « Dépôt de dossier » : une liste par établissement,
// gérée par la scolarité centrale.
export function CandidatureDocumentsPanel() {
  const [establishments, setEstablishments] = useState<string[]>([]);
  const [establishment, setEstablishment] = useState('');
  const [uniform, setUniform] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [label, setLabel] = useState('');
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const request = useCallback((path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${sessionStorage.getItem('auth_token') ?? ''}`);
    return fetch(`${apiUrl}${path}`, { ...options, headers });
  }, []);

  const errorMessage = async (response: Response) => {
    const result = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    return (Array.isArray(result.message) ? result.message[0] : result.message) ?? 'Action impossible.';
  };

  const loadRequirements = useCallback(async (name: string) => {
    if (!name) { setRequirements([]); return; }
    const response = await request(`/scolarite/document-requirements?establishment=${encodeURIComponent(name)}`);
    if (response.ok) setRequirements((await response.json()) as Requirement[]);
    else setMessage(await errorMessage(response));
  }, [request]);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`${apiUrl}/establishments`);
      if (!response.ok) { setMessage('Impossible de charger les établissements.'); return; }
      const names = ((await response.json()) as { name: string }[]).map((item) => item.name);
      setEstablishments(names);
      setEstablishment((current) => current || names[0] || '');
    })();
  }, []);

  // Établissement dont la liste est affichée : la liste commune en mode « identique pour tous ».
  const scope = uniform ? ALL_ESTABLISHMENTS : establishment;

  useEffect(() => {
    void (async () => {
      const response = await request('/scolarite/document-requirements-mode');
      if (response.ok) setUniform(((await response.json()) as { uniform: boolean }).uniform);
    })();
  }, [request]);

  useEffect(() => {
    void loadRequirements(scope);
  }, [scope, loadRequirements]);

  const changeMode = async (value: boolean) => {
    if (value === uniform) return;
    setSaving(true);
    setMessage('');
    setEditing(null);
    const response = await request('/scolarite/document-requirements-mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uniform: value }),
    });
    if (response.ok) setUniform(value);
    else setMessage(await errorMessage(response));
    setSaving(false);
  };

  const send = async (path: string, method: string, body?: unknown) => {
    setSaving(true);
    setMessage('');
    const response = await request(path, {
      method,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const ok = response.ok;
    if (!ok) setMessage(await errorMessage(response));
    else await loadRequirements(scope);
    setSaving(false);
    return ok;
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!label.trim()) { setMessage('Le libellé de la pièce est obligatoire.'); return; }
    if (await send('/scolarite/document-requirements', 'POST', { establishment: scope, label })) setLabel('');
  };
  const update = async (requirement: Requirement, patch: { label?: string; active?: boolean }) => {
    if (await send(`/scolarite/document-requirements/${requirement.id}`, 'PATCH', patch)) setEditing(null);
  };
  const remove = async (requirement: Requirement) => {
    if (!window.confirm(`Supprimer « ${requirement.label} » ?`)) return;
    await send(`/scolarite/document-requirements/${requirement.id}`, 'DELETE');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="text-xs text-slate-400">
        Pièces demandées à l&apos;étudiant dans son propre espace, à l&apos;étape « Dépôt de dossier » de sa candidature en ligne. Chaque établissement a sa liste. Chaque pièce peut être activée, désactivée ou supprimée.
      </p>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <p className="mb-3 text-xs font-bold text-slate-300">Liste des pièces</p>
        <div className="flex flex-wrap gap-2">
          {([[false, 'Une liste par établissement'], [true, 'Identique pour tous les établissements']] as const).map(([value, text]) => (
            <button
              key={text}
              type="button"
              disabled={saving}
              aria-pressed={uniform === value}
              onClick={() => void changeMode(value)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${touch} ${uniform === value ? 'border-blue-500/50 bg-blue-600/20 text-blue-300' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {text}
            </button>
          ))}
        </div>
        {uniform && <p className="mt-3 text-xs text-slate-400">Tous les étudiants voient les mêmes pièces, quel que soit leur établissement. Les listes propres à chaque établissement sont conservées mais ne servent plus tant que ce mode est actif.</p>}
      </div>
      {message && <p className="break-words rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">{message}</p>}
      <form onSubmit={(event) => void create(event)} className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        {!uniform && <label className="min-w-0 w-full text-xs text-slate-300 sm:w-auto">
          Établissement
          <select
            value={establishment}
            onChange={(event) => { setEstablishment(event.target.value); setEditing(null); setMessage(''); }}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 max-[1024px]:min-h-[44px]"
          >
            {establishments.length ? establishments.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">Aucun établissement</option>}
          </select>
        </label>}
        <label className="min-w-0 w-full text-xs text-slate-300 sm:w-auto sm:flex-1">
          Nouvelle pièce à téléverser
          <input
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex. Certificat médical"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 max-[1024px]:min-h-[44px]"
          />
        </label>
        <button disabled={saving || !scope} className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold sm:w-auto ${touch}`}>
          <Plus className="mr-1 inline h-4 w-4" />
          Ajouter
        </button>
      </form>
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <FileText className="h-4 w-4" />
          Pièces obligatoires à fournir{uniform ? ' — tous les établissements' : establishment ? ` — ${establishment}` : ''}
        </h2>
        <div className="space-y-2">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${requirement.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {editing?.id === requirement.id ? (
                <input
                  autoFocus
                  value={editing.label}
                  onChange={(event) => setEditing({ ...editing, label: event.target.value })}
                  className={`min-w-0 flex-1 basis-40 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-base sm:text-sm ${touch}`}
                />
              ) : (
                <span className={`min-w-0 flex-1 basis-40 break-words text-sm ${requirement.active ? '' : 'text-slate-500 line-through'}`}>{requirement.label}</span>
              )}
              {editing?.id === requirement.id ? (
                <button onClick={() => void update(requirement, { label: editing.label })} disabled={saving} className={`rounded-lg bg-blue-600 px-2 py-1 text-xs ${touch}`}>
                  Enregistrer
                </button>
              ) : (
                <button aria-label={`Modifier ${requirement.label}`} onClick={() => setEditing({ id: requirement.id, label: requirement.label })} className={`${iconButton} text-slate-400`}>
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => void update(requirement, { active: !requirement.active })} disabled={saving} className={`rounded-lg border border-slate-700 px-2 py-1 text-xs ${touch}`}>
                {requirement.active ? 'Désactiver' : 'Activer'}
              </button>
              <button aria-label={`Supprimer ${requirement.label}`} onClick={() => void remove(requirement)} disabled={saving} className={`${iconButton} text-rose-400`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!requirements.length && <p className="text-sm text-slate-500">{uniform ? 'Aucune pièce configurée :' : 'Aucune pièce configurée pour cet établissement :'} les pièces par défaut (CIN, quitus, certificat de résidence, relevé de bac en L1) s&apos;appliquent.</p>}
        </div>
      </section>
    </div>
  );
}
