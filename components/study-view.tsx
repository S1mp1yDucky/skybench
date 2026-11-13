import { Button } from "@/components/ui/button"
import type { StudyPack } from "@/lib/catalog"

export function StudyView({
  study,
  onContinue,
  continueLabel,
}: {
  study: StudyPack
  onContinue: () => void
  continueLabel: string
}) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-[#8a5a32] uppercase">Official public pages, studied locally</p>
        <h1 className="mt-2 font-heading text-4xl text-[#1c1915]">{study.name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4d463c]">{study.intro}</p>
        <a
          href={study.site}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-[#23453d] underline-offset-4 hover:underline"
        >
          {study.siteLabel}
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {study.features.map((feature) => (
          <article key={feature.group} className="rounded-xl border border-[#e2d6c4] bg-white p-4">
            <h2 className="text-sm font-semibold text-[#1c1915]">{feature.group}</h2>
            <p className="mt-1 text-sm leading-6 text-[#4d463c]">{feature.items}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Requirements" items={study.requirements} />
        <ListCard title="Dependencies" items={study.dependencies} />
        <ListCard title="Pricing and free tier" items={study.pricing} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="h-10" onClick={onContinue}>
          {continueLabel}
        </Button>
        <p className="text-xs leading-5 text-[#6d6256]">Prices below, inside the console, are teaching figures. Check the official page before quoting them.</p>
      </div>
    </div>
  )
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-[#e2d6c4] bg-[#f7f1e6] p-4">
      <h2 className="text-sm font-semibold text-[#1c1915]">{title}</h2>
      <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#4d463c]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
