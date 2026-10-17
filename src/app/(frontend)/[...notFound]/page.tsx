import { notFound } from 'next/navigation'

// The app has two root layouts (frontend / payload route groups), so unmatched public URLs
// are routed here to render the branded (frontend)/not-found.tsx with a 404 status.
export default function CatchAllNotFound() {
  notFound()
}
