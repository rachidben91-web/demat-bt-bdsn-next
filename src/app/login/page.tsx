import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentAuthContext, getDefaultAppPath } from "@/lib/auth";

export default async function LoginPage() {
  const auth = await getCurrentAuthContext();

  if (
    auth.user &&
    (auth.role === "admin" ||
      (auth.officeAccount?.accountStatus === "active" &&
        (auth.officeAccount.canAccessOfficeApp || auth.officeAccount.canAccessTerrainApp)))
  ) {
    redirect(getDefaultAppPath(auth) ?? "/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#f5f7fb_34%,#eef3f8_68%,#eaedf4_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[34px] border border-white/90 bg-white shadow-[0_42px_120px_rgba(15,23,42,0.14)] lg:grid-cols-[0.88fr_1.12fr]">
          <section className="relative overflow-hidden bg-[linear-gradient(155deg,#6c93e3_0%,#5f84d7_36%,#6f8fce_72%,#aab8db_100%)] px-8 py-9 text-white sm:px-10 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%)]" />
            <div className="absolute bottom-[-6rem] left-[-4rem] h-52 w-52 rounded-full bg-yellow-200/20 blur-3xl" />
            <div className="absolute right-[-2rem] top-[-2rem] h-44 w-44 rounded-full bg-blue-100/14 blur-3xl" />
            <div className="absolute bottom-[-5rem] right-[-4rem] h-56 w-56 rounded-full bg-white/8 blur-3xl" />
            <div className="relative flex h-full min-h-[360px] flex-col">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_18px_34px_rgba(15,23,42,0.18)] backdrop-blur">
                <Image
                  alt="Icône DEMAT-BT"
                  className="h-14 w-14 drop-shadow-[0_12px_18px_rgba(15,23,42,0.18)]"
                  height={280}
                  src="/dashboard-favicon.png"
                  width={280}
                />
              </div>

              <div className="mt-12">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-blue-100/80">
                  DEMAT-BT V2
                </p>
                <h1 className="mt-5 max-w-[9ch] text-[3.15rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                  DEMAT-BT
                </h1>
                <p className="mt-6 max-w-[24ch] text-base leading-7 text-blue-50/86">
                  Connexion sécurisée à l&apos;espace bureau et à l&apos;application terrain.
                </p>
              </div>

              <div className="mt-auto pt-10">
                <div className="flex items-center gap-3 text-sm text-blue-50/90">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                  <span>Accès selon ton profil bureau.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="relative bg-[linear-gradient(180deg,#fffdfa_0%,#ffffff_100%)] px-8 py-9 sm:px-10 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d83a2f]">
              Connexion
            </p>
            <h2 className="mt-4 font-serif text-[3rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
              Bonjour
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Connecte-toi avec ton email ou ton identifiant technicien.
            </p>
            <div className="mt-9">
              {auth.user &&
              auth.role !== "admin" &&
              !auth.officeAccount?.canAccessOfficeApp &&
              !auth.officeAccount?.canAccessTerrainApp ? (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Compte connecté mais aucun accès bureau ou terrain actif n&apos;a été trouvé.
                  Vérifie la table
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
