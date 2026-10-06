// Parcours réels de l'ISSTM (fiche « Filières » de l'établissement).
// Le cycle indique où le parcours est proposé : LICENCE seulement, MASTER seulement, ou les deux.
// `mention` et `levels` documentent la fiche d'origine : seul le cycle est utilisé par l'application
// (un parcours n'est pas encore restreint niveau par niveau, par exemple GB n'a pas de L1).
export const ISSTM_PARCOURS = [
  { name: 'Génie Informatique (GI)', mention: 'STNPA', cycles: ['LICENCE'], levels: ['L1', 'L2', 'L3'] },
  { name: 'Génie Biomédical (GB)', mention: 'STNPA', cycles: ['LICENCE', 'MASTER'], levels: ['L2', 'L3', 'M1', 'M2'] },
  { name: 'Génie Électronique et Informatique (GEI)', mention: 'STNPA', cycles: ['LICENCE'], levels: ['L1', 'L2', 'L3'] },
  { name: 'Génie Électrique (GE)', mention: 'STI', cycles: ['LICENCE'], levels: ['L1', 'L2', 'L3'] },
  { name: 'Génie Civil (GCIVIL)', mention: 'STGC', cycles: ['LICENCE', 'MASTER'], levels: ['L1', 'L2', 'L3', 'M1', 'M2'] },
  { name: 'Génie Industriel (GIND)', mention: 'STI', cycles: ['LICENCE', 'MASTER'], levels: ['L1', 'L2', 'L3', 'M1', 'M2'] },
  { name: 'Génie Thermique (GT)', mention: 'STI', cycles: ['MASTER'], levels: ['M1', 'M2'] },
  { name: 'Génie Hydraulique (GHYD)', mention: 'STGC', cycles: ['LICENCE'], levels: ['L1', 'L2', 'L3'] },
  { name: 'Génie Architecture (GARCHI)', mention: 'STGC', cycles: ['LICENCE'], levels: ['L1', 'L2', 'L3'] },
  { name: 'Froid et Énergie (FE)', mention: 'STI', cycles: ['LICENCE'], levels: ['L1', 'L2', 'L3'] },
];
