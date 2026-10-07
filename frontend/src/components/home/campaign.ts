// Campagne de bourse et annonces : aucune API n'existe encore côté backend.
// Ces types servent de contrat pour un futur branchement (ex. GET /campaign, GET /announcements).
// Tant qu'aucune donnée n'est fournie, la page n'affiche rien de fictif.
export type CampaignStatus = 'A_VENIR' | 'OUVERTE' | 'CLOTUREE';

export type Campaign = {
  academicYear: string; // ex. « 2026-2027 »
  status: CampaignStatus;
  opensAt: string | null; // date ISO
  closesAt: string | null; // date ISO
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  publishedAt: string; // date ISO
};
