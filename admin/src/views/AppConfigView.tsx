import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { cn } from '@/lib/cn'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { CodeBlock, CopyField } from '@/components/CopyField'
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconExternal,
  IconMobile,
  IconServer,
} from '@/components/icons'
import {
  configSnippet,
  KEY_NOTES,
  PLATFORM_FILE,
  PLATFORM_LABEL,
  PLATFORM_REPO,
  type Platform,
} from './providerMeta'

/**
 * Everything a provider needs to point their own iOS and Android builds at their
 * directory: the address, the block to paste, and how to check it worked.
 *
 * Written as three ordered steps because it genuinely is a sequence — copy,
 * paste, rebuild — and a provider doing this the first time needs to know where
 * they are in it.
 */
export function AppConfigView() {
  const setView = useStore((s) => s.setView)
  const org = useStore((s) => s.org)
  const loadOrg = useStore((s) => s.loadOrg)
  const [platform, setPlatform] = useState<Platform>('ios')
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (org) return
    // The organization normally arrives with the session; this covers a reload
    // that raced the auth bootstrap.
    let alive = true
    loadOrg().finally(() => alive && setGaveUp(true))
    return () => {
      alive = false
    }
  }, [org, loadOrg])

  if (!org) {
    return gaveUp ? (
      <EmptyState
        icon={<IconServer />}
        title="Could not load your organization"
        detail="Try again in a moment."
        action={<Button size="sm" onClick={() => loadOrg()}>Try again</Button>}
      />
    ) : (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const snippet = configSnippet(platform, org.directory_url)
  const nothingPublished = org.published_count === 0

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">App configuration</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Point your own iOS and Android builds at this directory. Your app then opens
            straight onto your platforms — no search, no other organization's platforms.
          </p>
        </div>
        <a
          href="/guide/portal-mode/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-link transition-colors hover:text-link-hover"
        >
          <IconBook /> Full guide
        </a>
      </header>

      {nothingPublished && (
        <Card className="border-warning/25 bg-warning-bg p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-warning">
              <IconAlert />
            </span>
            <div className="text-[13px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-warning">Nothing is published yet.</span>{' '}
              The configuration below is already valid, but your app will open onto an empty
              list until at least one platform is visible.{' '}
              <button
                onClick={() => setView('platforms')}
                className="font-semibold text-link underline-offset-2 hover:underline"
              >
                Add a platform
              </button>
              .
            </div>
          </div>
        </Card>
      )}

      <Step
        n={1}
        title="Copy your directory address"
        detail="This address is permanent. It is compiled into every build you ship, so it never changes — even if you rename your organization."
      >
        <div className="flex max-w-2xl flex-col gap-3.5">
          <CopyField value={org.directory_url} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <IconCheck />
              <span className="tnum">{org.published_count}</span> platform
              {org.published_count === 1 ? '' : 's'} visible in your app
            </span>
            <a
              href={`${org.directory_url}/api/v1/directory`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-link transition-colors hover:text-link-hover"
            >
              See exactly what the app receives <IconExternal />
            </a>
          </div>
        </div>
      </Step>

      <Step
        n={2}
        title="Paste it into your app's config"
        detail={`Replace the LMS_DIRECTORY block in your fork of ${PLATFORM_REPO[platform]}. Do the same in each environment you build (dev, stage, prod).`}
      >
        <div className="flex flex-col gap-4">
          <div
            role="tablist"
            aria-label="Platform"
            className="flex flex-wrap items-center gap-2"
          >
            {(['ios', 'android'] as Platform[]).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={platform === p}
                onClick={() => setPlatform(p)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                  platform === p
                    ? 'border-brand-500/40 bg-brand-50 text-brand-700'
                    : 'border-line text-muted hover:text-ink',
                )}
              >
                <IconMobile /> {PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>

          <CodeBlock code={snippet} filename={PLATFORM_FILE[platform]} />

          <dl className="flex flex-col divide-y divide-line overflow-hidden rounded-md border border-line">
            {KEY_NOTES.map(({ key, what }) => (
              <div key={key} className="flex flex-col gap-1 px-3.5 py-3 sm:flex-row sm:gap-4">
                <dt className="shrink-0 font-mono text-[12.5px] font-semibold text-ink sm:w-40">
                  {key}
                </dt>
                <dd className="text-[13px] leading-relaxed text-muted">{what}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Step>

      <Step
        n={3}
        title="Rebuild and ship"
        detail="Your build now reads its platform list from here. Add, hide or reorder a platform in this console and installed apps pick it up on their next launch — no app update, no review."
      >
        <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-ink-soft">
          <Bullet>
            Everything else in your config — bundle id, signing, Firebase, app name and
            icon — stays yours. This block only decides which platforms the app offers.
          </Bullet>
          <Bullet>
            A learner picks one of your platforms and the app re-themes to it: its logo, its
            accent colour, its sign-in background.
          </Bullet>
          <Bullet>
            Your app never shows a search box and never lists another organization's
            platforms.
          </Bullet>
        </ul>
      </Step>
    </div>
  )
}

function Step({
  n,
  title,
  detail,
  children,
}: {
  n: number
  title: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: (n - 1) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="tnum mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600">
            {n}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{detail}</p>
            <div className="mt-5">{children}</div>
          </div>
        </div>
      </Card>
    </motion.section>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
      <span>{children}</span>
    </li>
  )
}
