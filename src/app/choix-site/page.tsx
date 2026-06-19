import { chooseSiteAction } from "@/app/choix-site/actions";
import { getReadableOfficeModules, requireAnyOfficeAccess } from "@/lib/auth";
import { SITE_OPTIONS } from "@/lib/site-options";

type ChooseSitePageProps = {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
};

export default async function ChooseSitePage({ searchParams }: ChooseSitePageProps) {
  const auth = await requireAnyOfficeAccess({ requireSite: false });
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const returnTo = resolvedSearchParams?.returnTo ?? "/";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            DEMAT-BT Next
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Choisir le site de travail
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Le choix sera conserve pour les modules bureau autorises de ce compte.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SITE_OPTIONS.map((site) => (
            <form
              key={site.code}
              action={chooseSiteAction}
              className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
            >
              <input name="siteCode" type="hidden" value={site.code} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    {site.code}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{site.label}</h2>
                </div>
                <button
                  className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                  type="submit"
                >
                  Ouvrir
                </button>
              </div>
            </form>
          ))}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Modules disponibles : {allowedModules.length || "aucun module bureau autorise"}.
        </p>
      </section>
    </main>
  );
}
