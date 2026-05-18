export const kpis = [
  {
    label: "BT detectes",
    value: "148",
    trend: "+12 aujourd'hui",
    detail: "Extraction ciblee depuis le PDF journalier avec regroupement des documents associes.",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "BT modifies",
    value: "17",
    trend: "5 urgents",
    detail: "Affectations revues manuellement avant emission des briefs techniciens.",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    label: "A reporter O2",
    value: "09",
    trend: "Suivi actif",
    detail: "Elements encore en attente de reprise dans le workflow de terrain.",
    tone: "bg-orange-50 text-orange-700",
  },
  {
    label: "Equipes actives",
    value: "24",
    trend: "VLG",
    detail: "Techniciens et managers relies au referentiel de journee pour la future V2.",
    tone: "bg-sky-50 text-sky-700",
  },
];

export const uploadSteps = [
  {
    title: "Importer le PDF du jour",
    description: "Zone de reception des documents entrants avec futur glisser-deposer et controle du fichier source.",
    badge: "Pret a concevoir",
    badgeTone: "bg-emerald-50 text-emerald-700",
    action: "Ajouter un PDF",
  },
  {
    title: "Lancer l'extraction des BT",
    description: "Traitement du PDF, lecture des zones et reconstruction des BT avec pieces jointes associees.",
    badge: "Parcours critique",
    badgeTone: "bg-sky-50 text-sky-700",
    action: "Executer",
  },
  {
    title: "Preparer le Brief equipe",
    description: "Affectation par technicien, verification des ecarts et generation du support de diffusion.",
    badge: "Etape suivante",
    badgeTone: "bg-slate-100 text-slate-700",
    action: "Previsualiser",
  },
];

export const technicianAssignments = [
  {
    name: "Sophie Martin",
    team: "Equipe reseau nord",
    count: "12",
    progress: "72%",
    status: "Pret",
    statusTone: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Bilal Rahmani",
    team: "Equipe intervention rapide",
    count: "7",
    progress: "46%",
    status: "A valider",
    statusTone: "bg-amber-50 text-amber-700",
  },
  {
    name: "Camille Dupont",
    team: "Equipe maintenance sud",
    count: "9",
    progress: "64%",
    status: "Modification O2",
    statusTone: "bg-orange-50 text-orange-700",
  },
];

export const supportItems = [
  {
    title: "Brief terrain",
    description: "Suivi des sujets critiques, verrouillage edition et traces de validation par jour.",
    metric: "14",
    metricLabel: "points a passer",
    status: "Verrou libre",
    statusTone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Param activites",
    description: "Base de parametrage partagee pour reconstruire le futur support d'exploitation.",
    metric: "08",
    metricLabel: "activites types",
    status: "A structurer",
    statusTone: "bg-sky-50 text-sky-700",
  },
];

export const activityFeed = [
  {
    title: "Maquette V2 initialisee",
    description: "Le nouveau socle Next.js est cree dans un projet separe, sans impact sur la production.",
    time: "11 mai · 09:12",
    dot: "bg-emerald-500",
  },
  {
    title: "Referentiel techniciens a reconnecter",
    description: "La structure est prevue pour brancher ensuite le chargement des equipes depuis Supabase.",
    time: "11 mai · 09:27",
    dot: "bg-sky-500",
  },
  {
    title: "Support Journee priorise",
    description: "La future gestion des verrous et de l'historique est deja reservee dans l'architecture fonctionnelle.",
    time: "11 mai · 09:41",
    dot: "bg-orange-500",
  },
];
