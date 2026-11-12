import { useState } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { IconArrowRight, IconBulb, IconChevronRight, IconHourglassHigh, IconSearch } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PageHead } from "@/components/pm/page-head"
import { SearchBox } from "@/components/pm/search-box"
import { StatusBadge } from "@/components/pm/status-badge"
import { EmptyState } from "@/components/pm/empty-state"
import { guideFor, ROLE_INTRO, type ResolvedTopic, type Role, type Waiting } from "./guide/guide-content"
import { Illustration } from "./guide/illustrations"

const asRole = (r: unknown): Role => (r === "SUPER_ADMIN" || r === "CLIENT_ADMIN" ? r : "USER")

const matches = (t: ResolvedTopic, q: string) =>
    [t.title, t.summary, ...t.steps, ...t.tips, t.waiting?.title ?? "", t.waiting?.body ?? "", ...(t.waiting?.next ?? [])]
        .some((s) => s.toLowerCase().includes(q))

/** Role-based help: what your role is for, then a step-by-step topic for each part of the app you can use. */
export const Guide = () => {
    const profile = useSelector((s: any) => s.profile.profile)
    // The sidebar loads the profile; until then we don't know which guide to show
    return profile ? <RoleGuide role={asRole(profile.role)} /> : <div className="py-16 text-center text-sm text-muted-foreground">Loading guide…</div>
}

function RoleGuide({ role }: { role: Role }) {
    const [search, setSearch] = useState("")
    const q = search.trim().toLowerCase()
    const topics = guideFor(role).filter((t) => !q || matches(t, q))

    const jump = (id: string) => document.getElementById(`guide-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" })

    return (
        <>
            <PageHead title="Guide" sub={<>How ProjoMan works for you as <StatusBadge value={role} className="align-middle" /></>}>
                <SearchBox value={search} onChange={setSearch} placeholder="Search the guide" />
            </PageHead>

            {!q && <RoleOverview role={role} />}

            <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
                <nav aria-label="Guide topics" className="sticky top-[76px] hidden gap-0.5 lg:grid">
                    <div className="px-2.5 pb-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[.06em] text-subtle-foreground">Topics</div>
                    {topics.map((t) => (
                        <button key={t.id} onClick={() => jump(t.id)}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-muted-foreground transition-colors duration-fast hover:bg-surface-2 hover:text-foreground">
                            <t.icon size={16} className="flex-none text-subtle-foreground" />{t.title}
                        </button>
                    ))}
                </nav>

                <div className="grid gap-5">
                    {topics.length === 0
                        ? <div className="rounded-xl border bg-card"><EmptyState icon={IconSearch} title={`Nothing in the guide matches “${search.trim()}”`} hint="Try a section name, like Tasks or Notifications." /></div>
                        : topics.map((t, i) => <TopicSection key={t.id} topic={t} role={role} index={i} />)}
                </div>
            </div>
        </>
    )
}

/** Who you are in ProjoMan: a headline, what you can do, and your part in the flow of work. */
function RoleOverview({ role }: { role: Role }) {
    const intro = ROLE_INTRO[role]
    return (
        <section aria-label="Your role" className="grid animate-pm-in gap-5 rounded-xl border bg-card p-5 shadow-sm">
            <p className="max-w-[640px] text-[17px] font-medium leading-snug tracking-[-0.01em]">{intro.headline}</p>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                {intro.can.map((c, i) => (
                    <div key={c.text} className="flex animate-pm-in items-start gap-3 rounded-lg border bg-surface-2 p-3" style={{ animationDelay: `${i * 60}ms` }}>
                        <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent text-accent-foreground"><c.icon size={17} /></span>
                        <span className="text-[13.5px] leading-snug">{c.text}</span>
                    </div>
                ))}
            </div>

            <div>
                <div className="mb-2 text-[13px] font-medium text-muted-foreground">How work flows in ProjoMan</div>
                <ol className="flex flex-wrap items-center gap-y-2">
                    {intro.flow.map((s, i) => (
                        <li key={s.label} className="flex items-center">
                            <span className={cn("rounded-full px-3 py-1 text-[13px] font-medium",
                                s.yours ? "bg-primary text-primary-foreground" : "bg-surface-3 text-subtle-foreground")}>
                                {s.label}
                            </span>
                            {i < intro.flow.length - 1 && <IconChevronRight size={16} className="mx-1 text-subtle-foreground" />}
                        </li>
                    ))}
                </ol>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-subtle-foreground">
                    <span className="size-2.5 rounded-full bg-primary" />Your part
                    <span className="ml-3 size-2.5 rounded-full bg-surface-3 ring-1 ring-border" />Handled by someone else
                </div>
            </div>
        </section>
    )
}

/** One topic: numbered steps, tips and any "waiting on someone" note beside a picture of the screen. */
function TopicSection({ topic: t, role, index }: { topic: ResolvedTopic; role: Role; index: number }) {
    const navigate = useNavigate()
    const headingId = `guide-${t.id}-title`
    return (
        <section id={`guide-${t.id}`} aria-labelledby={headingId}
            className="grid scroll-mt-[84px] animate-pm-in gap-4 rounded-xl border bg-card p-5 shadow-sm"
            style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
            <header className="flex flex-wrap items-start gap-3">
                <span className="grid size-9 flex-none place-items-center rounded-lg bg-accent text-accent-foreground"><t.icon size={19} /></span>
                <div className="min-w-0 flex-1">
                    <h2 id={headingId} className="text-[17px] font-semibold tracking-[-0.015em]">{t.title}</h2>
                    <p className="mt-0.5 text-[13.5px] text-muted-foreground">{t.summary}</p>
                </div>
                {t.link && <Button variant="outline" size="sm" onClick={() => navigate(t.link!.url)}>{t.link.label}<IconArrowRight /></Button>}
            </header>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                <div className="grid gap-4">
                    <ol className="grid gap-2.5">
                        {t.steps.map((s, i) => (
                            <li key={s} className="flex gap-3 text-[13.5px] leading-relaxed">
                                <span className="num grid size-6 flex-none place-items-center rounded-full bg-surface-3 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                                <span className="pt-0.5">{s}</span>
                            </li>
                        ))}
                    </ol>
                    {t.tips.map((tip) => (
                        <div key={tip} className="tone-blue tone-bg flex gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] text-foreground">
                            <IconBulb size={17} className="tone-fg mt-px flex-none" /><span>{tip}</span>
                        </div>
                    ))}
                    {t.waiting && <WaitingNote waiting={t.waiting} />}
                </div>
                <Illustration art={t.art} role={role} />
            </div>
        </section>
    )
}

/** Your side of a flow that someone else has to finish: what's happening and what to do meanwhile. */
function WaitingNote({ waiting: w }: { waiting: Waiting }) {
    return (
        <div className="tone-amber tone-bg grid gap-2 rounded-lg px-3.5 py-3 text-[13px] text-foreground">
            <div className="flex items-center gap-2 font-medium"><IconHourglassHigh size={17} className="tone-fg flex-none" />{w.title}</div>
            <p className="text-muted-foreground">{w.body}</p>
            <div className="text-xs font-medium uppercase tracking-[.04em] text-muted-foreground">Next steps</div>
            <ul className="grid gap-1">
                {w.next.map((n) => (
                    <li key={n} className="flex gap-2"><IconArrowRight size={15} className="tone-fg mt-0.5 flex-none" /><span>{n}</span></li>
                ))}
            </ul>
        </div>
    )
}
