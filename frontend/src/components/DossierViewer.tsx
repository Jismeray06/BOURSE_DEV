'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, LoaderCircle, X } from 'lucide-react';

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

type Dossier = {
  student: { fullName: string; email: string; establishment: string | null; level: string | null; program: string | null };
  status: string;
  submittedAt: string | null;
  quitus: { code: string } | null;
  documents: { id: string; type: string; originalName: string; mimeType: string; size: number }[];
  profile?: DossierProfile;
};

const GENDER_LABELS: Record<DossierProfile['gender'], string> = { FEMININ: 'Féminin', MASCULIN: 'Masculin', AUTRE: 'Autre' };
const QUALITY_LABELS: Record<'PASSANT' | 'REDOUBLANT', string> = { PASSANT: 'Passant(e)', REDOUBLANT: 'Redoublant(e)' };
const boolLabel = (value: boolean | null) => (value === null ? '—' : value ? 'Oui' : 'Non');

const profileFields = (profile: DossierProfile): [string, string][] => [
  ['Matricule', profile.registrationNumber || '—'],
  ['Téléphone', profile.phone || '—'],
  ['Genre', GENDER_LABELS[profile.gender] ?? '—'],
  ['Formation', profile.registrationForm || '—'],
  ['Date et lieu de naissance', profile.birthDatePlace || '—'],
  ['CIN', profile.cin || '—'],
  ['Nationalité', profile.nationality || '—'],
  ['Adresse', profile.address || '—'],
  ['Établissement précédent', profile.previousEstablishment || '—'],
  ['Année du Bac', profile.bacYear || '—'],
  ['Série du Bac', profile.bacSeries || '—'],
  ['Centre du Bac', profile.bacCenter || '—'],
  ['Déjà inscrit à l’université', boolLabel(profile.previousUniversityRegistration)],
  ['Nom du père', profile.fatherName || '—'],
  ['Nom de la mère', profile.motherName || '—'],
  ['Téléphone des parents', profile.parentsPhone || '—'],
  ['Ville des parents', profile.parentsCity || '—'],
  ['Répondant', profile.respondentName || '—'],
  ['Téléphone du répondant', profile.respondentPhone || '—'],
  ['Adresse du répondant', profile.respondentAddress || '—'],
  ['Situation matrimoniale', profile.maritalStatus || '—'],
  ['Année de licence', profile.licenceYear || '—'],
  ['Mention', profile.mention || '—'],
  ['Niveau précédent', profile.previousLevel || '—'],
  ['Parcours précédent', profile.previousProgram || '—'],
  ['Qualité', profile.quality ? QUALITY_LABELS[profile.quality] : '—'],
];

export function DossierViewer({ endpoint, onClose }: { endpoint: string; onClose: () => void }) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  const openDocument = async (id: string, download: boolean) => {
    const response = await fetch(`${apiUrl}/documents/${id}/file`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` } });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    if (download) link.download = dossier?.documents.find((item) => item.id === id)?.originalName ?? 'piece';
    else link.target = '_blank';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Dossier étudiant</h2>
            <p className="text-xs text-slate-400">Consultation en lecture seule</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} className="rounded-xl border border-slate-700 p-2"><X className="h-5 w-5" /></button>
        </div>

        {loading && <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement du dossier…</div>}
        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

        {dossier && (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm sm:grid-cols-2">
              <p><span className="block text-xs text-slate-500">Nom</span>{dossier.student.fullName}</p>
              <p><span className="block text-xs text-slate-500">E-mail</span>{dossier.student.email}</p>
              <p><span className="block text-xs text-slate-500">Établissement</span>{dossier.student.establishment ?? '—'}</p>
              <p><span className="block text-xs text-slate-500">Formation</span>{dossier.student.level} · {dossier.student.program}</p>
              <p><span className="block text-xs text-slate-500">Statut</span>{dossier.status}</p>
              <p><span className="block text-xs text-slate-500">Quitus</span>{dossier.quitus?.code ?? 'Non renseigné'}</p>
            </div>

            {dossier.profile && (
              <div>
                <h3 className="mb-3 font-bold">Informations complètes du dossier</h3>
                <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm sm:grid-cols-2">
                  {profileFields(dossier.profile).map(([label, value]) => (
                    <p key={label}><span className="block text-xs text-slate-500">{label}</span>{value}</p>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 font-bold">Pièces téléversées</h3>
              {dossier.documents.length ? (
                <div className="space-y-2">
                  {dossier.documents.map((document) => (
                    <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                        <span className="truncate text-sm">{document.originalName}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => void openDocument(document.id, false)} className="flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs"><ExternalLink className="h-3.5 w-3.5" />Ouvrir</button>
                        <button onClick={() => void openDocument(document.id, true)} className="flex min-h-[44px] items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-bold"><Download className="h-3.5 w-3.5" />Télécharger</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Aucune pièce enregistrée.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
