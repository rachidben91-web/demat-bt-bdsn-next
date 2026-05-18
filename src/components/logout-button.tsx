import { logoutAction } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgba(255,255,255,0.12)] transition hover:bg-slate-100"
        type="submit"
      >
        Se deconnecter
      </button>
    </form>
  );
}
