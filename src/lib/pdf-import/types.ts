export type PdfAttachmentType =
  | "BT"
  | "AT"
  | "PLAN"
  | "PHOTO"
  | "PROC"
  | "FOR113"
  | "STREET"
  | "DOC";

export type ExtractedTeamMember = {
  nni: string;
  name: string;
};

export type ExtractedBtDocument = {
  page: number;
  type: PdfAttachmentType;
};

export type BtSourceMode = "daily_pdf" | "unitary_import";

export type BtBriefWorkflowStatus = "normal" | "o2_pending" | "o2_validated";

export type ExtractedBt = {
  entryId?: string;
  id: string;
  pageStart: number;
  objet: string;
  datePrevue: string;
  client: string;
  localisation: string;
  atNum: string;
  designation: string;
  duree: string;
  analyseDesRisques: string;
  observations: string;
  team: ExtractedTeamMember[];
  docs: ExtractedBtDocument[];
  derivedPdfStoragePath?: string | null;
  derivedPdfPageCount?: number | null;
  mobileReady?: boolean;
  mobileReadyAt?: string | null;
  mobileReadyByEmail?: string | null;
  sourceMode?: BtSourceMode;
  briefWorkflowStatus?: BtBriefWorkflowStatus;
  teamOverride?: ExtractedTeamMember[] | null;
  replacementSourceTeam?: ExtractedTeamMember[] | null;
  workflowNote?: string | null;
  o2PendingAt?: string | null;
  o2PendingByEmail?: string | null;
  o2ValidatedAt?: string | null;
  o2ValidatedByEmail?: string | null;
  replacementOfEntryId?: string | null;
  replacedByEntryId?: string | null;
  supersededAt?: string | null;
  supersededByEmail?: string | null;
};

export type PdfImportAnalysis = {
  importedDayIso: string | null;
  pageCount: number;
  pdfName: string;
  bts: ExtractedBt[];
};

export type BtImportDaySource = {
  dayId: string;
  dayDate: string;
  siteCode: string;
  sourcePdfName: string;
  sourcePdfStoragePath: string | null;
};
