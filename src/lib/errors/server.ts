/** Server only: writes the original error to the log, so the user can get a clear text and the team still finds the cause. */
export function registrarErro(onde: string, err: unknown): void {
  console.error(`[${onde}] erro inesperado`, err)
}
