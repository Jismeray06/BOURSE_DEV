'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileImage, FileText, LoaderCircle, Mail, X } from 'lucide-react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type DossierProfile = {
  registrationNumber: string;
  phone: string;
  gender: 'FEMININ' | 'MASCULIN' | 'AUTRE';
  registrationForm: string;
  birthDatePlace: string | null;
  cin: string | null;
  nationality: string | null;
  address: string | null;
  previousEstablishment: string | null;
  bacYear: string | null;
  bacSeries: string | null;
  bacCenter: string | null;
  previousUniversityRegistration: boolean | null;
  fatherName: string | null;
  motherName: string | null;
  parentsPhone: string | null;
  parentsCity: string | null;
  respondentName: string | null;
  respondentPhone: string | null;
  respondentAddress: string | null;
  maritalStatus: string | null;
  licenceYear: string | null;
  mention: string | null;
  previousLevel: string | null;
  previousProgram: string | null;
  quality: 'PASSANT' | 'REDOUBLANT' | null;
};

type DossierDocument = { id: string; type: string; originalName: string; mimeType: string; size: number };

type Dossier = {
  student: { fullName: string; email: string | null; establishment: string | null; level: string | null; program: string | null };
  // Selon l'espace, la formation est portée par le dossier lui-même ou par la fiche de l'étudiant.
  establishment?: string | null;
  level?: string | null;
  program?: string | null;
  status: string;
  submittedAt: string | null;
  quitus: { code: string } | null;
  documents: DossierDocument[];
  profile?: DossierProfile;
};

type Tab = 'documents' | 'profile';

const GENDER_LABELS: Record<DossierProfile['gender'], string> = { FEMININ: 'Féminin', MASCULIN: 'Masculin', AUTRE: 'Autre' };
const QUALITY_LABELS: Record<'PASSANT' | 'REDOUBLANT', string> = { PASSANT: 'Passant(e)', REDOUBLANT: 'Redoublant(e)' };
const FORM_LABELS: Record<string, string> = { LICENCE: 'Licence', MASTER: 'Master' };

// Libellés des statuts de dossier (et des statuts de fiche d'inscription côté établissement).
const STATUS: Record<string, { label: string; style: string }> = {
  BROUILLON: { label: 'Brouillon', style: 'border-slate-700 bg-slate-950/60 text-slate-300' },
  SOUMIS: { label: 'Soumis — à examiner', style: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  EN_REVISION: { label: 'En révision', style: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  VALIDE: { label: 'Validé', style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  REFUSE: { label: 'Refusé', style: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  INSCRIT: { label: 'Inscrit', style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  INACTIF: { label: 'Inactif', style: 'border-slate-700 bg-slate-950/60 text-slate-300' },
};

// Libellés lisibles des types de pièces ; un type inconnu est simplement « humanisé » (certificat_medical → Certificat medical).
const DOCUMENT_LABELS: Record<string, string> = {
  cin: 'Carte d’identité nationale',
  quitus: 'Quitus',
  residence: 'Certificat de résidence',
  unemployment: 'Attestation de chômage',
  bac: 'Relevé de notes du baccalauréat',
  photo: 'Photo d’identité',
  carte_etudiant: 'Ancienne carte d’étudiant',
  lettre_engagement: 'Lettre d’engagement',
  certificat_residence: 'Certificat de résidence',
  recu_versement: 'Reçu de versement',
  acte_naissance: 'Acte de naissance',
  diplome_licence: 'Diplôme ou attestation de Licence',
};
const documentLabel = (type: string) => {
  const known = DOCUMENT_LABELS[type];
  if (known) return known;
  const text = type.replace(/_+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Pièce';
};

const fileSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);
const yesNo = (value: boolean | null) => (value === null ? null : value ? 'Oui' : 'Non');

type Row = [label: string, value: string | null | undefined];
type Group = { title: string; rows: Row[] };

// Les informations de la fiche sont regroupées par thème ; les champs vides sont masqués plutôt que remplacés par des tirets.
const profileGroups = (profile: DossierProfile): Group[] => [
  {
    title: 'Identité',
    rows: [
      ['Matricule', profile.registrationNumber],
      ['Genre', GENDER_LABELS[profile.gender]],
      ['Date et lieu de naissance', profile.birthDatePlace],
      ['Nationalité', profile.nationality],
      ['CIN', profile.cin],
      ['Situation matrimoniale', profile.maritalStatus],
      ['Téléphone', profile.phone],
      ['Adresse', profile.address],
    ],
  },
  {
    title: 'Parcours scolaire',
    rows: [
      ['Formation', FORM_LABELS[profile.registrationForm] ?? profile.registrationForm],
      ['Qualité', profile.quality ? QUALITY_LABELS[profile.quality] : null],
      ['Établissement précédent', profile.previousEstablishment],
      ['Baccalauréat', [profile.bacYear, profile.bacSeries && `série ${profile.bacSeries}`, profile.bacCenter && `centre de ${profile.bacCenter}`].filter(Boolean).join(' · ') || null],
      ['Déjà inscrit à l’université', yesNo(profile.previousUniversityRegistration)],
      ['Année de licence', profile.licenceYear],
      ['Mention', profile.mention],
      ['Niveau précédent', profile.previousLevel],
      ['Parcours précédent', profile.previousProgram],
    ],
  },
  {
    title: 'Famille',
    rows: [
      ['Père', profile.fatherName],
      ['Mère', profile.motherName],
      ['Téléphone des parents', profile.parentsPhone],
      ['Ville des parents', profile.parentsCity],
    ],
  },
  {
    title: 'Répondant',
    rows: [
      ['Nom', profile.respondentName],
      ['Téléphone', profile.respondentPhone],
      ['Adresse', profile.respondentAddress],
    ],
  },
];

export function DossierViewer({ endpoint, onClose }: { endpoint: string; onClose: () => void }) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('documents');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` } });
        const result = await response.json().catch(() => ({})) as Dossier & { message?: string | string[] };
        if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message[0] : result.message ?? 'Impossible de charger le dossier.');
        setDossier(result);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Impossible de charger le dossier.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [endpoint]);

  // Échap ferme le dossier.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openDocument = async (id: string, download: boolean) => {
    setNotice('');
    const response = await fetch(`${apiUrl}/documents/${id}/file`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` } });
    if (!response.ok) { setNotice('Cette pièce n’a pas pu être ouverte.'); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    if (download) link.download = dossier?.documents.find((item) => item.id === id)?.originalName ?? 'piece';
    else link.target = '_blank';
    link.click();
    URL.revokeObjectURL(url);
  };

  const establishment = dossier ? dossier.establishment ?? dossier.student.establishment : null;
  const level = dossier ? dossier.level ?? dossier.student.level : null;
  const program = dossier ? dossier.program ?? dossier.student.program : null;
  const formation = [level, program].filter(Boolean).join(' · ');
  const status = dossier ? STATUS[dossier.status] ?? { label: dossier.status, style: 'border-slate-700 bg-slate-950/60 text-slate-300' } : null;
  const submitted = dossier ? formatDate(dossier.submittedAt) : null;
  const groups = dossier?.profile ? profileGroups(dossier.profile).map((group) => ({ ...group, rows: group.rows.filter((row): row is [string, string] => Boolean(row[1])) })).filter((group) => group.rows.length) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Dossier de l’étudiant" className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
        <header className="shrink-0 border-b border-slate-800 px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-sm font-bold text-white" aria-hidden>
              {dossier ? initials(dossier.student.fullName) : '…'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-bold leading-tight text-white">{dossier ? dossier.student.fullName : 'Dossier de l’étudiant'}</h2>
              {dossier?.student.email && (
                <p className="mt-1 flex items-center gap-1.5 break-all text-xs text-slate-400"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />{dossier.student.email}</p>
              )}
            </div>
            <button aria-label="Fermer le dossier" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>
          {dossier && status && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full border px-3 py-1 font-semibold ${status.style}`}>{status.label}</span>
              {establishment && <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">{establishment}</span>}
              {formation && <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">{formation}</span>}
              {dossier.quitus && <span className="rounded-full border border-slate-700 px-3 py-1 font-mono text-slate-300">Quitus {dossier.quitus.code}</span>}
            </div>
          )}
          {submitted && <p className="mt-3 text-xs text-slate-500">Dossier déposé le {submitted}</p>}
        </header>

        {dossier && (
          <div role="tablist" aria-label="Contenu du dossier" className="flex shrink-0 gap-1 border-b border-slate-800 px-4 sm:px-5">
            {([['documents', `Pièces justificatives (${dossier.documents.length})`], ['profile', 'Fiche de l’étudiant']] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px min-h-[44px] border-b-2 px-3 text-xs font-bold transition ${tab === id ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading && <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement du dossier…</div>}
          {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          {notice && <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{notice}</p>}

          {dossier && tab === 'documents' && (
            dossier.documents.length ? (
              <ul className="space-y-3">
                {dossier.documents.map((document) => {
                  const Icon = document.mimeType.startsWith('image/') ? FileImage : FileText;
                  return (
                    <li key={document.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><Icon className="h-5 w-5" aria-hidden /></span>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="text-sm font-semibold text-slate-100">{documentLabel(document.type)}</p>
                        <p className="truncate text-xs text-slate-500">{document.originalName} · {fileSize(document.size)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => void openDocument(document.id, false)} className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 px-3.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"><ExternalLink className="h-3.5 w-3.5" aria-hidden />Ouvrir</button>
                        <button onClick={() => void openDocument(document.id, true)} aria-label={`Télécharger ${document.originalName}`} className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white transition hover:bg-blue-500"><Download className="h-3.5 w-3.5" aria-hidden />Télécharger</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">Aucune pièce n’a été déposée pour ce dossier.</p>
            )
          )}

          {dossier && tab === 'profile' && (
            groups.length ? (
              <div className="space-y-7">
                {groups.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-400">{group.title}</h3>
                    <dl>
                      {group.rows.map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 border-b border-slate-800/70 py-3 last:border-b-0">
                          <dt className="text-xs text-slate-400">{label}</dt>
                          <dd className="break-words text-sm text-slate-100">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">Aucune fiche d’inscription n’est liée à ce dossier.</p>
            )
          )}
        </div>
      </section>
    </div>
  );
}
