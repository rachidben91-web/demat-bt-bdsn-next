export type Technician = {
  id: string;
  nni: string;
  name: string;
  lastName: string;
  firstName: string;
  site: string;
  manager: string;
  role: string;
  color: string;
  ptc: boolean;
  ptd: boolean;
};

export type ActivityStatus = "Present" | "Absent" | "Greve";

export type ActivityDefinition = {
  id: string;
  label: string;
  color: string;
  status: ActivityStatus;
};

export type DailyAssignment = {
  id: string;
  rank: number;
  technicianId: string;
  agent: string;
  workMode: string;
  activity: string;
  observations: string;
  briefAgence: string;
  briefDistance: string;
  debriefAgence: string;
  debriefDistance: string;
  gtv: string;
};

export type HistoryEntry = {
  id: string;
  date: string;
  agent: string;
  activity: string;
  observation: string;
  brief: string;
  debrief: string;
  grv: string;
};

const palette = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#6366f1",
  "#ec4899",
  "#06b6d4",
  "#10b981",
  "#eab308",
  "#8b5cf6",
  "#fb7185",
];

const rawTechnicians = [
  ["ABIR", "Bilal", "H26975", "Rachid Ben Daoud", true, true],
  ["AIT MANSOUR", "Myriam", "J25784", "Sabrina Salemkour", false, false],
  ["ARIF", "Kamel", "F62981", "Mustapha Arbib", true, false],
  ["ASSOUMO", "Alain-Bruno", "D45777", "Sabrina Salemkour", true, true],
  ["BEEHARRY-PANRAY", "Sanjeet", "B09571", "Rachid Ben Daoud", false, false],
  ["BENALLOU", "Radouane", "A02277", "Karim Deboussi", true, true],
  ["BENTOUMI", "Mounir", "E50275", "Karim Deboussi", true, true],
  ["BRIET", "Dylan", "C38084", "Rachid Ben Daoud", true, true],
  ["CAUSSARIEU", "Thomas", "A94073", "Narith Nhiv", false, false],
  ["CISSE", "Amadou", "B99384", "Karim Deboussi", true, true],
  ["CISSE", "Moussa", "I13252", "Laetitia Romao", false, false],
  ["CORREIA", "Christopher", "A37272", "Laetitia Romao", false, false],
  ["DADSI", "Amine", "E23680", "Mustapha Arbib", true, true],
  ["DEBY", "Medhi", "J19576", "Laetitia Romao", true, true],
  ["DESFONTAINES", "Richard", "E51772", "Narith Nhiv", false, false],
  ["DIALLO", "Amadou", "A73777", "Sabrina Salemkour", true, true],
  ["DUBOIS", "Guillaume", "E34879", "Laetitia Romao", true, true],
  ["DUCOLLET", "Jeremy", "J04081", "Zied Zeramdini", true, true],
  ["ESSOBAT NFONZOCK", "Judith", "I20180", "Mustapha Arbib", true, true],
  ["FELHI", "Mohamed", "I16183", "Karim Deboussi", true, true],
  ["FOURMONT", "Cedric", "I20971", "Rachid Ben Daoud", false, false],
  ["GALLEDOU", "Sikhou", "A67070", "Zied Zeramdini", false, false],
  ["GNEBIO", "Noel", "G59180", "Sabrina Salemkour", false, false],
  ["GUFFROY", "Maxime", "G81772", "Sabrina Salemkour", true, true],
  ["HAJJI", "Toufik", "C53276", "Mustapha Arbib", false, false],
  ["HARBOULI", "Rachid", "H49056", "Narith Nhiv", false, false],
  ["HENRY", "Alexandre", "C33576", "Zied Zeramdini", false, false],
  ["HUET", "Frederic", "E82472", "Zied Zeramdini", false, false],
  ["JOUANNE", "Alexandre", "C20671", "Narith Nhiv", true, true],
  ["KLEIN", "Julien", "J24255", "Laetitia Romao", false, false],
  ["LE BOMIN", "Thomas", "G47781", "Narith Nhiv", true, true],
  ["MAGASSOUBA", "Mohamed", "C30671", "Karim Deboussi", false, false],
  ["MAMMOU", "Mounir", "G90777", "Mustapha Arbib", false, false],
  ["NAVAUX", "Aurelien", "A39083", "Karim Deboussi", false, false],
  ["ROBICHON", "Jordan", "A14356", "Rachid Ben Daoud", false, false],
  ["SALEP", "Alexandre", "G82872", "Karim Deboussi", false, false],
  ["SEGUY", "Alexis", "C35074", "Zied Zeramdini", false, false],
  ["SHEIKH", "Arslan", "F80482", "Laetitia Romao", false, false],
  ["SISSOKO", "Seran", "F86682", "Mustapha Arbib", true, true],
  ["SISSOKO", "Tiemoko", "E06180", "Zied Zeramdini", true, true],
  ["STEHELYN", "Hakim", "E10173", "Rachid Ben Daoud", false, false],
  ["TAKROUNI", "Jamila", "H64778", "Karim Deboussi", false, false],
  ["TCHERNIAWSKY", "Christophe", "C18572", "Laetitia Romao", false, false],
  ["TELDJI", "Djamel", "H11281", "Mustapha Arbib", true, true],
  ["TEMUR", "Berkay Can", "X01563", "Mustapha Arbib", true, true],
  ["THE", "Romain", "E23670", "Zied Zeramdini", false, false],
  ["TOUIL", "Mourad", "D80482", "Sabrina Salemkour", true, false],
  ["VAN-UXEN", "Robert", "J14432", "Narith Nhiv", false, false],
  ["VERTIL", "Wilco", "A77455", "Sabrina Salemkour", true, true],
  ["WELLE", "David", "A31480", "Sabrina Salemkour", true, true],
] as const;

export const technicians: Technician[] = rawTechnicians.map((row, index) => {
  const [lastName, firstName, nni, manager, ptc, ptd] = row;

  return {
    id: nni,
    nni,
    name: `${lastName} ${firstName}`,
    lastName,
    firstName,
    site: "Villeneuve-la-Garenne",
    manager,
    role: "Technicien Gaz",
    color: palette[index % palette.length],
    ptc,
    ptd,
  };
});

export const supportTabs = [
  { id: "brief", label: "Brief / Debrief", icon: "📝" },
  { id: "activities", label: "Param Activites", icon: "🎨" },
  { id: "history", label: "Donnees & Historique", icon: "📊" },
] as const;

export const sidebarSteps = [
  {
    id: "1",
    title: "Importer le PDF du jour",
    description: "Charge le PDF brut recu pour la journee.",
  },
  {
    id: "2",
    title: "Extraire les BT",
    description: "Analyse le PDF et prepare les donnees terrain.",
  },
  {
    id: "3",
    title: "Importer un BT",
    description: "Ajoute ou met a jour un BT unitaire dans la journee en cours.",
  },
];

export const activityDefinitions: ActivityDefinition[] = [
  { id: "is-jour-1", label: "IS JOUR 1", color: "#fff400", status: "Present" },
  { id: "is-jour-2", label: "IS JOUR 2", color: "#ffef00", status: "Present" },
  { id: "is-jour-3", label: "IS JOUR 3", color: "#fce300", status: "Present" },
  { id: "dep-1", label: "DEP 1", color: "#f7db00", status: "Present" },
  { id: "dep-2", label: "DEP 2", color: "#e8ce00", status: "Present" },
  { id: "dep-3", label: "DEP 3", color: "#d4b400", status: "Present" },
  { id: "astreinte", label: "ASTREINTE", color: "#1d9bd7", status: "Present" },
  { id: "clientele", label: "CLIENTELE", color: "#d9d9d9", status: "Present" },
  { id: "travaux", label: "TRAVAUX", color: "#95b7de", status: "Present" },
  { id: "travaux-astreinte", label: "TRAVAUX ASTREINTE", color: "#416fbd", status: "Present" },
  { id: "cicm", label: "CICM", color: "#abc88e", status: "Present" },
  { id: "rob", label: "ROB", color: "#aad090", status: "Present" },
  { id: "cicm-optic", label: "CICM OPTIC", color: "#aad18e", status: "Present" },
  { id: "rsf", label: "RSF", color: "#aad18e", status: "Present" },
  { id: "loca", label: "LOCA", color: "#f7b788", status: "Present" },
  { id: "immeuble-neuf", label: "IMMEUBLE NEUF", color: "#c69300", status: "Present" },
  { id: "immeuble-monoxyde", label: "IMMEUBLE MONOXYDE", color: "#c59700", status: "Present" },
  { id: "prepa-immeuble", label: "PREPA IMMEUBLE", color: "#cc9f00", status: "Present" },
  { id: "magasin", label: "MAGASIN", color: "#806400", status: "Present" },
  { id: "fp", label: "FP", color: "#ff0c0c", status: "Absent" },
  { id: "air-pedagogique", label: "AIR PEDAGOGIQUE", color: "#07a646", status: "Present" },
  { id: "prepa-eap", label: "PREPA EAP", color: "#0b9c4b", status: "Present" },
  { id: "reunion", label: "REUNION D'EQUIPE", color: "#7f6500", status: "Present" },
  { id: "administratif", label: "ADMINISTRATIF", color: "#7d6500", status: "Present" },
  { id: "sortie-astreinte", label: "SORTIE D'ASTREINTE", color: "#c7d1df", status: "Present" },
  { id: "cp", label: "CP", color: "#d00000", status: "Absent" },
  { id: "10", label: "10", color: "#d00000", status: "Absent" },
  { id: "21", label: "21", color: "#d00000", status: "Absent" },
  { id: "41", label: "41", color: "#d00000", status: "Absent" },
  { id: "rtt", label: "RTT", color: "#d00000", status: "Absent" },
  { id: "abs", label: "ABS", color: "#d00000", status: "Absent" },
  { id: "pat", label: "PAT", color: "#d00000", status: "Absent" },
  { id: "a2t", label: "A2T", color: "#999999", status: "Greve" },
];

const presentActivities = [
  "CLIENTELE",
  "IS JOUR 2",
  "ASTREINTE",
  "DEP 1",
  "TRAVAUX",
  "TRAVAUX ASTREINTE",
  "CICM",
  "CICM OPTIC",
  "RSF",
  "LOCA",
  "REUNION D'EQUIPE",
  "SORTIE D'ASTREINTE",
  "AIR PEDAGOGIQUE",
  "PREPA EAP",
];

const absentActivities = ["RTT", "CP", "ABS"];
const greveActivities = ["A2T"];

export const dailyAssignments: DailyAssignment[] = technicians.map((technician, index) => {
  const cycle = index % 12;
  const activity =
    cycle === 4 ? absentActivities[index % absentActivities.length]
    : cycle === 9 ? greveActivities[0]
    : presentActivities[index % presentActivities.length];

  const presenceMode = technician.ptc && technician.ptd ? "PTC-PTD" : technician.ptc ? "PTC" : technician.ptd ? "PTD" : "—";

  return {
    id: `assignment-${technician.id}`,
    rank: index + 1,
    technicianId: technician.id,
    agent: technician.name,
    workMode: presenceMode,
    activity,
    observations:
      activity === "A2T"
        ? "Mobilisation a confirmer"
        : activity === "RTT" || activity === "CP" || activity === "ABS"
          ? "Hors planning journalier"
          : index % 5 === 0
            ? "Controle zone nord"
            : "—",
    briefAgence: index % 3 === 0 ? "OK" : "—",
    briefDistance: technician.ptc && index % 4 === 0 ? "OK" : "—",
    debriefAgence: index % 6 === 0 ? "A faire" : "—",
    debriefDistance: technician.ptc && index % 7 === 0 ? "A faire" : "—",
    gtv: index % 8 === 0 ? "Oui" : "—",
  };
});

export const historyEntries: HistoryEntry[] = dailyAssignments.slice(0, 32).map((assignment, index) => ({
  id: `history-${assignment.technicianId}-${index}`,
  date: `2026-05-${String(15 - (index % 5)).padStart(2, "0")}`,
  agent: assignment.agent,
  activity: assignment.activity,
  observation: assignment.observations === "—" ? "" : assignment.observations,
  brief: assignment.briefAgence === "OK" || assignment.briefDistance === "OK" ? "Saisi" : "",
  debrief: assignment.debriefAgence === "A faire" || assignment.debriefDistance === "A faire" ? "En attente" : "",
  grv: assignment.gtv === "Oui" ? "Oui" : "",
}));

export const savedDays = [
  "14/05/2026 — 29 BT",
  "07/05/2026 — 29 BT",
  "30/04/2026 — 31 BT",
  "23/04/2026 — 26 BT",
];

export const zoneLabels = [
  "Villeneuve la Garenne: — C",
  "Groslay: — C",
  "Bois Colombes: — C",
  "Saint Denis: — C",
];

export const supportSummary = {
  dateLabel: "Jeudi 14 mai 2026",
  weekLabel: "Semaine N° 20",
  lastUpdate: "Mounir le 13/05/2026 11:21:41",
  editStatus: "—",
  server: "—",
  weatherNote: "Aucune prevision disponible pour jeudi 14 mai.",
  globalObservation: "",
  savedDayStatus: "Derniere selection : 07/05/2026 — 29 BT, 3 modifie(s), 3 a reporter, 0 O2 OK.",
};

export const supportMetrics = {
  presents: dailyAssignments.filter((row) => !absentActivities.includes(row.activity) && !greveActivities.includes(row.activity)).length,
  absents: dailyAssignments.filter((row) => absentActivities.includes(row.activity)).length,
  greve: dailyAssignments.filter((row) => greveActivities.includes(row.activity)).length,
  totalDays: 19,
  totalRows: 510,
  topActivity: "CLIENTELE (84)",
};
