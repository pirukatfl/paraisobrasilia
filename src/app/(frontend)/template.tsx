export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-[page-in_var(--duration-base)_var(--ease-out-expo)_both]">
      {children}
    </div>
  )
}
