"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeWriteModule } from "@/lib/auth";
import type { PdfImportAnalysis } from "@/lib/pdf-import/types";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SaveBtImportResult = {
  ok: boolean;
  message: string;
  dayDate?: string;
  dayId?: string;
};

type BtImportDayRow = {
  id: string;
  day_date: string;
};

export async function saveBtImportDayAction(
  analysis: PdfImportAnalysis,
  sourcePdfStoragePath?: string | null,
): Promise<SaveBtImportResult> {
  try {
    const auth = await requireOfficeWriteModule("import_pdf");

    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    if (!analysis.importedDayIso) {
      return {
        ok: false,
        message: "La date de journee n'a pas ete reconnue dans le nom du PDF.",
      };
    }

    const supabase = await createServerSupabaseClient();
    const userEmail = auth.user?.email ?? null;
    const activeSiteCode = await getActiveSiteCodeOrDefault();

    const { data: existingDay, error: existingDayError } = await supabase
      .from("bt_import_days")
      .select("id, day_date")
      .eq("day_date", analysis.importedDayIso)
      .eq("site_code", activeSiteCode)
      .maybeSingle();

    if (existingDayError) {
      throw existingDayError;
    }

    let day: BtImportDayRow | null = existingDay as BtImportDayRow | null;

    if (day) {
      const { error: updateDayError } = await supabase
        .from("bt_import_days")
        .update({
          source_pdf_name: analysis.pdfName,
          source_pdf_storage_path: sourcePdfStoragePath ?? null,
          page_count: analysis.pageCount,
          bt_count: analysis.bts.length,
          imported_by_email: userEmail,
          imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", day.id);

      if (updateDayError) {
        throw updateDayError;
      }

      const { error: deleteEntriesError } = await supabase
        .from("bt_import_entries")
        .delete()
        .eq("import_day_id", day.id);

      if (deleteEntriesError) {
        throw deleteEntriesError;
      }
    } else {
      const { data: insertedDay, error: insertDayError } = await supabase
        .from("bt_import_days")
        .insert({
          day_date: analysis.importedDayIso,
          site_code: activeSiteCode,
          source_pdf_name: analysis.pdfName,
          source_pdf_storage_path: sourcePdfStoragePath ?? null,
          page_count: analysis.pageCount,
          bt_count: analysis.bts.length,
          imported_by_email: userEmail,
        })
        .select("id, day_date")
        .single();

      if (insertDayError || !insertedDay) {
        throw insertDayError ?? new Error("Impossible de creer la journee importee.");
      }

      day = insertedDay as BtImportDayRow;
    }

    if (!day) {
      throw new Error("Journee importee introuvable apres sauvegarde.");
    }

    if (analysis.bts.length > 0) {
      const { error: insertEntriesError } = await supabase
        .from("bt_import_entries")
        .insert(
          analysis.bts.map((bt) => ({
            import_day_id: day!.id,
            bt_id: bt.id,
            page_start: bt.pageStart,
            objet: bt.objet,
            date_prevue: bt.datePrevue,
            client: bt.client,
            localisation: bt.localisation,
            at_num: bt.atNum,
            designation: bt.designation,
            duree: bt.duree,
            analyse_des_risques: bt.analyseDesRisques,
            observations: bt.observations,
            team: bt.team,
            docs: bt.docs,
            derived_pdf_storage_path: bt.derivedPdfStoragePath ?? null,
            derived_pdf_page_count: bt.derivedPdfPageCount ?? null,
          })),
        );

      if (insertEntriesError) {
        throw insertEntriesError;
      }
    }

    revalidatePath("/brief");
    revalidatePath("/import-pdf");

    return {
      ok: true,
      message: `Journee ${analysis.importedDayIso} enregistree avec ${analysis.bts.length} BT.`,
      dayDate: day.day_date,
      dayId: day.id,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur lors de la sauvegarde de la journee.",
    };
  }
}
