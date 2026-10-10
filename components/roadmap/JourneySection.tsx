import Link from "next/link";
import type { HomeContent } from "@/lib/services/public";
import { JourneyMap } from "./JourneyMap";

type Props = { settings: NonNullable<HomeContent["settings"]>; milestones: HomeContent["milestones"] };

/** Interactive map plus a plain list of the same milestones for keyboard, screen-reader and no-JS visitors. */
export function JourneySection({ settings, milestones }: Props) {
  if (milestones.length === 0) return null;
  return (
    <section aria-labelledby="journey-title">
      <JourneyMap milestones={milestones} copy={{ eyebrow: settings.journeyEyebrow, headline: settings.journeyHeadline, description: settings.journeyDescription }} />
      <div className="wrap">
        <details className="journey-list">
          <summary className="mono">View the journey as a list</summary>
          <ol>
            {milestones.map((m, i) => (
              <li key={m.id}>
                <b>
                  {i + 1}. {m.title}
                </b>
                <em className="mono">{[m.category, m.period, m.locationLabel].filter(Boolean).join(" · ")}</em>
                <span>{m.description ?? m.shortDescription}</span>
                {m.experience && (
                  <span>
                    {m.experience.position}, {m.experience.organization}
                  </span>
                )}
                {m.project && (
                  <span>
                    <Link href={`/projects/${m.project.slug}`}>Project: {m.project.title} →</Link>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}
