import { ImportPdfWorkspace } from "@/components/import-pdf-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";

export default async function ImportPdfPage() {
  const auth = await requireOfficeModule("import_pdf");
  const allowedModules = getReadableOfficeModules(auth);

  return (
    <ImportPdfWorkspace
      allowedModules={allowedModules}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
    />
  );
}
