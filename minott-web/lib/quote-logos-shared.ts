// Client-safe constants for the custom-logo mat upload (no Node imports).

/** `accept` attribute for the logo file input. Server validation is by magic bytes. */
export const LOGO_ACCEPT = "image/png,image/jpeg,application/pdf";

export const LOGO_MAX_BYTES = 10 * 1024 * 1024;

/** Categories whose products offer the "Add Custom Logo" option. */
export function isLogoCategory(slug: string): boolean {
  return slug === "mats";
}
