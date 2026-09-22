/** Prefix a public-folder path with Vite's base so GitHub Pages project sites resolve. */
export function publicUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (!path.startsWith("/")) return path;
  return `${base}${path}`;
}
