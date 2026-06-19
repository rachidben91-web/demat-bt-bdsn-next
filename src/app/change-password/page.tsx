import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/app/change-password/change-password-form";
import { getCurrentAuthContext } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const auth = await getCurrentAuthContext();

  if (!auth.user) {
    redirect("/login");
  }

  if (!auth.officeAccount || auth.officeAccount.passwordChanged) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#edf4fb_0%,#f6f8fc_45%,#eef3f8_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <section className="rounded-[28px] bg-[#232b3f] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
              DEMAT-BT V2
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Changement de mot de passe requis
            </h1>
            <p className="mt-4 max-w-[48ch] text-base leading-7 text-slate-300">
              Ce compte utilise un mot de passe temporaire. Avant d&apos;accéder aux modules,
              tu dois définir un mot de passe personnel.
            </p>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
              Securite
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Nouveau mot de passe
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Compte : {auth.user.email ?? auth.officeAccount.email}
            </p>
            <div className="mt-8">
              <ChangePasswordForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
