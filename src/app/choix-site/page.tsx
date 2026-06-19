import Image from "next/image";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { chooseSiteAction } from "@/app/choix-site/actions";
import { getReadableOfficeModules, requireAnyOfficeAccess } from "@/lib/auth";
import { SITE_OPTIONS, type SiteCode } from "@/lib/site-options";

type ChooseSitePageProps = {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
};

const siteDetails: Record<
  SiteCode,
  {
    badgeClassName: string;
    sectorName: string;
  }
> = {
  VLG: {
    badgeClassName: "bg-emerald-600 text-white shadow-[0_12px_24px_rgba(5,150,105,0.24)]",
    sectorName: "Villeneuve",
  },
  SAT: {
    badgeClassName: "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]",
    sectorName: "Sartrouville",
  },
};

export default async function ChooseSitePage({ searchParams }: ChooseSitePageProps) {
  const auth = await requireAnyOfficeAccess({ requireSite: false });
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const returnTo = resolvedSearchParams?.returnTo ?? "/";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fbff_32%,#eef4fb_62%,#e7edf6_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <div className="w-full overflow-hidden rounded-[34px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,251,255,0.92))] shadow-[0_38px_110px_rgba(30,64,175,0.13)] backdrop-blur">
          <div className="grid lg:grid-cols-[0.84fr_1.16fr]">
            <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),linear-gradient(160deg,#f8fbff_0%,#eef7ff_46%,#e8f2ff_100%)] px-8 py-9 sm:px-10">
              <div className="relative flex h-full min-h-[420px] flex-col">
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/90 bg-white/82 shadow-[0_16px_36px_rgba(148,163,184,0.20)]">
                    <Image
                      alt="Logo DEMAT-BT"
                      className="h-11 w-11"
                      height={64}
                      priority
                      src="/dashboard-favicon.png"
                      width={64}
                    />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.36em] text-slate-500">
                    DEMAT-BT V2
                  </span>
                </div>

                <div className="mt-14">
                  <h1 className="max-w-[9ch] text-[3.4rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#1d4ed8] sm:text-[4rem]">
                    Choisir le site
                  </h1>
                  <p className="mt-6 max-w-[30rem] text-base leading-7 text-slate-600">
                    Le site sélectionné pilote les modules bureau, les équipes visibles et les données du jour.
                  </p>
                </div>

                <div className="mt-auto pt-12">
                  <div className="max-w-sm rounded-[22px] border border-white/90 bg-white/74 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.14)]">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-blue-600 text-white">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {allowedModules.length || 0} modules disponibles
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-8 py-9 sm:px-10">
              <div className="flex flex-col gap-4">
                {SITE_OPTIONS.map((site) => {
                  const detail = siteDetails[site.code];

                  return (
                    <form
                      key={site.code}
                      action={chooseSiteAction}
                      className="group rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-[0_22px_58px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_28px_70px_rgba(37,99,235,0.14)]"
                    >
                      <input name="siteCode" type="hidden" value={site.code} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-[18px] text-sm font-bold ${detail.badgeClassName}`}>
                              {site.code}
                            </span>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                                Site de travail
                              </p>
                              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950">
                                {site.label}
                              </h2>
                            </div>
                          </div>
                          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                            Pilotage bureau, support journée et équipes rattachées au secteur {detail.sectorName}.
                          </p>
                        </div>

                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0f2f66] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,47,102,0.24)] transition group-hover:bg-[#1d4ed8]"
                          type="submit"
                        >
                          Ouvrir
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    Ton choix est conservé pour les modules bureau autorisés de ce compte.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
