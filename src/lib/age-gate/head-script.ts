/**
 * Runs before first paint: marks <html data-age-ok> for returning visitors so the overlay
 * never flashes. Static constant — no interpolated data (T-01-16).
 */
export const AGE_HEAD_SCRIPT =
  "try{if(/(?:^|;\\s*)pb_age_ok=1(?:;|$)/.test(document.cookie))document.documentElement.dataset.ageOk='1'}catch(e){}"
