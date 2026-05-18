export function buildTemporaryOfficePassword(fullName: string) {
  const [firstToken = "Acces"] = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const cleanedToken = firstToken.replace(/[^a-zA-Z0-9]/g, "") || "Acces";
  const capitalizedToken =
    cleanedToken.charAt(0).toUpperCase() + cleanedToken.slice(1).toLowerCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${capitalizedToken}+2026!${suffix}`;
}
