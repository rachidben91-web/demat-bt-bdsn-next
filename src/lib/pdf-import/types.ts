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

export type ExtractedBt = {
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
