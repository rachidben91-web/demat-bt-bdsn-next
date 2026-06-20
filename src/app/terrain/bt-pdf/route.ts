import { requireTerrainAccess } from "@/lib/auth";
import { resolveTerrainBtPdfSource } from "@/lib/terrain-pdf";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function buildErrorHtml(message: string) {
  const safeMessage = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PDF BT indisponible</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, #eef5fb 0%, #f8fbff 46%, #edf4fb 100%);
        color: #0f172a;
        font-family: Arial, sans-serif;
      }
      main {
        width: min(92vw, 34rem);
        padding: 2rem;
        border: 1px solid #fecaca;
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
      }
      p {
        margin: 0;
        line-height: 1.7;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>PDF BT indisponible</h1>
      <p>${safeMessage}</p>
    </main>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const auth = await requireTerrainAccess();
  const url = new URL(request.url);
  const dispatchItemId = url.searchParams.get("dispatchItemId") ?? "";
  const btEntryId = url.searchParams.get("btEntryId") ?? "";
  const btId = url.searchParams.get("btId") ?? "";

  const result = await resolveTerrainBtPdfSource(auth.officeAccount!, dispatchItemId, btEntryId, btId);

  if ("error" in result) {
    return new Response(buildErrorHtml(result.error), {
      status: 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return new Response(buildErrorHtml("Client admin Supabase indisponible."), {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const { data: fileData, error: fileError } = await adminSupabase.storage
    .from("bt-import-pdfs")
    .download(result.storagePath);

  if (fileError || !fileData) {
    return new Response(buildErrorHtml("Impossible de telecharger le PDF BT."), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(await fileData.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(result.btId)}.pdf"`,
      "Content-Type": "application/pdf",
    },
    status: 200,
  });
}
