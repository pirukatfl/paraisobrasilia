import { expect } from 'vitest'

/** Payload ValidationError: the field message is in data.errors[].message. */
export async function expectFieldError(promise: Promise<unknown>, message: string) {
  const err = (await promise.then(
    () => null,
    (e: unknown) => e,
  )) as { message?: string; data?: { errors?: { message: string }[] } } | null
  expect(err, 'expected a validation error').not.toBeNull()
  const messages = (err?.data?.errors ?? []).map((e) => e.message)
  expect(messages.length ? messages : [err?.message]).toContain(message)
}
