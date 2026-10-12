import type { HomeContent } from "@/lib/services/public";
import { JourneyMap } from "./JourneyMap";

type Props = {
  settings: NonNullable<HomeContent["settings"]>;
  milestones: HomeContent["milestones"];
};

/** Interactive map plus the same milestones as a list that only screen readers announce (no visible toggle). */
export function JourneySection({ settings, milestones }: Props) {
  if (milestones.length === 0) return null;
  return (
    <section aria-labelledby="journey-title">
      <JourneyMap
        milestones={milestones}
        copy={{
          eyebrow: settings.journeyEyebrow,
          headline: settings.journeyHeadline,
          description: settings.journeyDescription,
        }}
      />
      <div className="sr-only journey-list">
        <h3>Journey milestones</h3>
        <ol>
          {milestones.map((m, i) => (
            <li key={m.id}>
              <b>
                {i + 1}. {m.title}
              </b>
              <em className="mono">
                {[m.category, m.period, m.locationLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </em>
              <span>{m.description ?? m.shortDescription}</span>
              {m.experience && (
                <span>
                  {m.experience.position}, {m.experience.organization}
                </span>
              )}
              {/* Plain text, not a link: a focusable link here would be invisible to sighted keyboard users. */}
              {m.project && <span>Project: {m.project.title}</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
