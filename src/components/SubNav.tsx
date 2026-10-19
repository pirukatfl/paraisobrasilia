import Link from 'next/link'

import { pathForKey, SECTION_TABS } from '@/lib/pages/keys'

/** Quem somos sub-tabs (UI-SPEC S6): horizontal list, scrolls on mobile, active = accent underline. */
export function SubNav({ activeKey }: { activeKey: (typeof SECTION_TABS)[number]['key'] }) {
  return (
    <nav aria-label="Quem somos" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max gap-6 border-b border-line">
        {SECTION_TABS.map((tab) => {
          const active = tab.key === activeKey
          return (
            <li key={tab.key}>
              <Link
                href={pathForKey(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`type-eyebrow -mb-px inline-flex min-h-11 items-center border-b-2 hover:text-accent ${
                  active ? 'border-accent text-text' : 'border-transparent text-muted'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
