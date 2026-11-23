import * as React from "react"
import { Plus } from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const tap = "max-md:inline-flex max-md:min-h-11 max-md:items-center pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
const serif = "var(--font-display, var(--font-serif, ui-serif, Georgia, serif))"

export type FooterColumn = { title: string; links: { label: string; href: string }[] }

export interface WordmarkFooterProps extends React.HTMLAttributes<HTMLElement> {
  name: string
  legalName?: string
  year: number
  description?: string
  email?: string
  status?: string
  navLabel?: string
  columns: FooterColumn[]
  credit?: { label: string; href: string }
}

export function WordmarkFooter({
  name,
  legalName,
  year,
  description,
  email,
  status,
  navLabel = "Footer",
  columns,
  credit,
  className,
  ...props
}: WordmarkFooterProps) {
  return (
    <footer className={cn("relative overflow-hidden bg-background text-foreground", className)} {...props}>
      <div className="mx-auto grid w-full max-w-content gap-12 px-4 pt-16 pb-10 max-md:gap-6 max-md:pt-12 max-md:pb-6 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          <span className="block text-[25px] leading-none tracking-[-0.02em]" style={{ fontFamily: serif, fontWeight: 380 }}>
            {name}
          </span>
          {description && <p className="mt-4 max-w-[300px] text-[14px] leading-[22px] text-muted-foreground">{description}</p>}
          {status && (
            <p className="mt-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" />
              {status}
            </p>
          )}
        </div>
        <nav aria-label={navLabel} className="grid grid-cols-2 gap-8 max-md:hidden md:col-span-6 md:col-start-7 lg:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground/80 uppercase">{col.title}</p>
              <ul className="mt-4 grid gap-2.5 pointer-coarse:mt-2 pointer-coarse:gap-0">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className={cn("text-[14px] text-muted-foreground transition-colors hover:text-foreground", tap)}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <nav aria-label={navLabel} className="-mx-4 grid gap-1 md:hidden">
          {columns.map((col) => (
            <details key={col.title} className="group rounded-card open:bg-foreground/[0.03]">
              <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-[12px] tracking-[0.14em] text-muted-foreground uppercase">{col.title}</span>
                <Plus className="size-4 text-muted-foreground/80 transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.75} aria-hidden="true" />
              </summary>
              <ul className="px-4 pb-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="block py-3 text-[15px] text-muted-foreground">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-content flex-col gap-2 px-4 pb-6 text-[13px] text-muted-foreground/80 sm:flex-row sm:items-center sm:gap-6 sm:px-6 lg:px-8">
        <p className="font-mono tabular-nums">
          © {year} {legalName ?? name}
        </p>
        {email && (
          <a href={`mailto:${email}`} className={cn("hover:text-foreground", tap)}>
            {email}
          </a>
        )}
        {credit && (
          <a href={credit.href} className={cn("hover:text-foreground sm:ml-auto", tap)}>
            {credit.label}
          </a>
        )}
      </div>
      <p
        aria-hidden="true"
        className="mx-auto max-w-content px-4 pb-4 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/50 sm:px-6 lg:px-8"
      >
        {name}
      </p>
    </footer>
  )
}

export default WordmarkFooter

