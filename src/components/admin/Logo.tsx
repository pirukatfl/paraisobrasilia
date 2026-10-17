/** Brand logo on the admin login screen (D-01). */
export default function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Payload admin graphic, static asset
    <img src="/brand/logo-320.webp" alt="Paraíso Brasília" width={200} height={168} style={{ height: 'auto' }} />
  )
}
