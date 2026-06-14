import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { TerrainInstallCardClient } from "@/components/terrain-install-card-client";
import { getCurrentAuthContext } from "@/lib/auth";

export default async function TerrainLoginPage() {
  const auth = await getCurrentAuthContext();

  if (
    auth.user &&
    auth.officeAccount?.accountStatus === "active" &&
    auth.officeAccount.canAccessTerrainApp &&
    auth.officeAccount.technicianId &&
    auth.officeAccount.terrainRole
  ) {
    redirect("/terrain");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#cffafe_0%,#e0f2fe_30%,#f0f9ff_62%,#f8fafc_100%)] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <div className="w-full overflow-hidden rounded-[34px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,250,255,0.96))] shadow-[0_42px_120px_rgba(14,116,144,0.14)]">
          <section className="relative overflow-hidden bg-[linear-gradient(165deg,#0f766e_0%,#0891b2_48%,#67e8f9_100%)] px-6 py-7 text-white sm:px-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%)]" />
            <div className="absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-[-4rem] left-[-2rem] h-40 w-40 rounded-full bg-cyan-100/14 blur-3xl" />
            <div className="relative">
              <div className="inline-flex h-18 w-18 items-center justify-center rounded-[24px] bg-white/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur">
                <Image
                  alt="Icône DEMAT-BT Terrain"
                  className="h-12 w-12 drop-shadow-[0_12px_18px_rgba(15,23,42,0.22)]"
                  height={280}
                  src="/dashboard-favicon.png"
                  width={280}
                />
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.34em] text-cyan-50/84">
                Accès terrain
              </p>
              <h1 className="mt-4 text-[2.7rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                DEMAT-BT Terrain
              </h1>
              <p className="mt-4 max-w-[24ch] text-sm leading-7 text-cyan-50/90">
                Connexion des techniciens pour accéder au hub terrain et récupérer la journée.
              </p>
            </div>
          </section>

          <section className="bg-[linear-gradient(180deg,#fefefe_0%,#f8fdff_100%)] px-6 py-7 sm:px-7">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
              Connexion mobile
            </p>
            <h2 className="mt-4 text-[2.4rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
              Bonjour
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Connecte-toi avec ton email ou ton identifiant technicien.
            </p>
            <div className="mt-8">
              <LoginForm submitLabel="Accéder à DEMAT-BT Terrain" variant="terrain" />
            </div>
            <TerrainInstallCardClient className="mt-6" />
          </section>
        </div>
      </div>
    </main>
  );
}
