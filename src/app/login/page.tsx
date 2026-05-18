import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentAuthContext } from "@/lib/auth";

export default async function LoginPage() {
  const auth = await getCurrentAuthContext();

  if (
    auth.user &&
    (auth.role === "admin" ||
      (auth.officeAccount?.accountStatus === "active" &&
        auth.officeAccount.canAccessOfficeApp))
  ) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#edf4fb_0%,#f6f8fc_45%,#eef3f8_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <section className="rounded-[28px] bg-[#232b3f] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
              DEMAT-BT Next
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Espace d&apos;administration terrain
            </h1>
            <p className="mt-4 max-w-[48ch] text-base leading-7 text-slate-300">
              Connexion requise pour acceder au module Support Journee et, ensuite, au
              futur menu Admin pour gerer les techniciens, managers et activites sans
              passer par Supabase.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Support Journee",
                "Referentiel techniciens",
                "Administration metier",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm font-semibold text-slate-100"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
              Connexion
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Connexion bureau
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Utilise ton compte Supabase pour ouvrir les modules bureau qui te sont attribues.
            </p>
            <div className="mt-8">
              {auth.user &&
              auth.role !== "admin" &&
              !auth.officeAccount?.canAccessOfficeApp ? (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Compte connecte mais aucun acces bureau actif n&apos;a ete trouve. Verifie
                  la table
                  <span className="mx-1 font-semibold">office_accounts</span>
                  pour cet utilisateur.
                </div>
              ) : null}
              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
