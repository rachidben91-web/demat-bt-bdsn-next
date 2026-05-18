import { logoutAction } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        className="rounded-[22px] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] px-4 py-3 text-sm font-semibold text-rose-700 shadow-[0_16px_34px_rgba(244,63,94,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-[linear-gradient(180deg,rgba(255,244,246,1),rgba(255,228,230,0.95))] hover:text-rose-800"
        type="submit"
      >
        Se déconnecter
      </button>
    </form>
  );
}
