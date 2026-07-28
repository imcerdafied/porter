export const WIZARD_STALE_MS = 3.5 * 60 * 60 * 1000;

export function isWizardStale(startedAt: string, now = Date.now()) {
  const started = new Date(startedAt).getTime();
  return Number.isFinite(started) && now - started >= WIZARD_STALE_MS;
}
