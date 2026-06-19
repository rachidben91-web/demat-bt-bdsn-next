import { ImportPdfWorkspace } from "@/components/import-pdf-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";

export default async function ImportPdfPage() {
  const auth = await requireOfficeModule("import_pdf");
  const allowedModules = getReadableOfficeModules(auth);
  const activeSiteCode = await getActiveSiteCodeOrDefault();

  return (
    <ImportPdfWorkspace
      activeSiteCode={activeSiteCode}
      allowedModules={allowedModules}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
    />
  );
}
