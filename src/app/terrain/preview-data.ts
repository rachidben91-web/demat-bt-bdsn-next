import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { toParisDateKey } from "@/lib/terrain-ui";

export const previewDispatch: MobileDispatchItem = {
  id: "preview-mobile-dispatch",
  acknowledgedAt: null,
  acknowledgedByEmail: null,
  activitySummary: "4 interventions transmises",
  btCount: 4,
  btPayload: [
    {
      btId: "BT22626009264",
      atNum: "",
      client: "NOM CLIENT Téléphone",
      designation:
        "Objet administratif / Mise à disposition de personnel E-learning AIPR",
      docs: [{ page: 1, type: "BT" }],
      duree: "DURÉE 02h00 08h15 - 10h15",
      localisation: "92390 VILLENEUVE LA GARENNE",
      objet:
        "CHEF DE TRAVAUX CHARGÉ D'OPÉRATION GAZ BENALLOU Radouane X OPÉRATEUR INTERVENANT",
      pageStart: 1,
      analyseDesRisques: "",
      observations: "",
    },
    {
      btId: "BT22626009845",
      atNum: "",
      client: "M. LE BRAS Benjamin - 0647786225",
      designation:
        "Activité clientèle VERIF BRANCHEMENT / Suite AD n°e6zg2 / FOR113+PHOTOS",
      docs: [
        { page: 2, type: "BT" },
        { page: 2, type: "DOC" },
        { page: 2, type: "DOC" },
      ],
      duree: "DURÉE 01h45 10h15 - 12h00",
      localisation: "12 RUE PASTEUR 95100 ARGENTEUIL",
      objet:
        "CHARGÉ D'OPÉRATION RESPONSABLE D'ÉQUIPE CHARGÉ D'IDENTIFICATION",
      pageStart: 2,
      analyseDesRisques:
        "Port des EPI obligatoire. Prudence sur le trajet, stationnement à surveiller et risque de circulation piétonne.",
      observations:
        "Bonjour, le client signale que son installation n'est pas sécurisée et souhaite laisser le compteur au sous-sol.",
    },
    {
      btId: "BT22626009848",
      atNum: "",
      client: "Mme HERBELIN Pauline - 0636907777",
      designation:
        "Activité clientèle REFIXATION CPTR / Suite AD n°e7704 / FOR113+PHOTOS",
      docs: [
        { page: 5, type: "BT" },
        { page: 5, type: "PHOTO" },
        { page: 5, type: "DOC" },
        { page: 5, type: "DOC" },
      ],
      duree: "DURÉE 01h00 13h00 - 14h00",
      localisation: "1 BIS BOULEVARD COTTE 95880 ENGHIEN LES BAINS",
      objet: "CLIENTÈLE - REFIXATION CPTR",
      pageStart: 5,
      analyseDesRisques:
        "Port des EPI obligatoire. Attention aux risques routiers et au stationnement réservé.",
      observations:
        "La cliente paraît vétuste et le compteur n'est pas bien fixé. Intervention souhaitée avec photo de l'installation.",
    },
    {
      btId: "BT22626010237",
      atNum: "",
      client: "M. GUILB - 06 27 30 21 41",
      designation:
        "Mise ou remise en service / Poste client T4 / MAT complet + PHOTO",
      docs: [
        { page: 9, type: "BT" },
        { page: 9, type: "PROC" },
        { page: 9, type: "DOC" },
        { page: 9, type: "DOC" },
      ],
      duree: "DURÉE 01h30 14h00 - 15h30",
      localisation: "71 AVENUE DE LA DIVISION LECLERC 95170 DEUIL LA BARRE",
      objet: "1re MES / n°W016A613 / PCE n°GI161788",
      pageStart: 9,
      analyseDesRisques:
        "Port des EPI obligatoire. Prudence sur le cheminement et vigilance autour des accès véhicules.",
      observations:
        "Compteur déjà sur place. Elect + Qualigaz OK. Chauffagiste M. GUILB présent.",
    },
  ],
  departureInstruction: "agency",
  managerName: "Karim Deboussi",
  missionDate: "2026-06-14",
  observation:
    "Journée de démonstration locale pour la version terrain. Priorité à la lecture rapide des BT et des alertes.",
  officeAccountId: "preview-account",
  publishedAt: "2026-06-14T06:52:00.000Z",
  siteCode: "VLG",
  technicianId: "preview-technician",
  technicianName: "BENALLOU Radouane",
  workMode: "PTC-PTD",
};

export const previewCurrentDateLabel = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeZone: "Europe/Paris",
}).format(new Date("2026-06-14T08:00:00.000Z"));

export const previewCurrentDateKey = toParisDateKey(new Date("2026-06-14T08:00:00.000Z"));

export const previewTechnician = {
  managerName: "Karim Deboussi",
  role: "Technicien gaz",
  site: "VLG",
};
