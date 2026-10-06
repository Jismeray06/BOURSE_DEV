export function dashboardPathForRole(role: string | null) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'ETABLISSEMENT' || role === 'ADMIN_ETABLISSEMENT' || role === 'SECRETAIRE') return '/etablissement';
  if (role === 'SCOLARITE_CENTRALE') return '/scolarite';
  if (role === 'ETUDIANT') return '/student';
  return null;
}
