import Image from "next/image";
import type { HomeContent } from "@/lib/services/public";
import { Multiline } from "./Multiline";

type Props = { settings: NonNullable<HomeContent["settings"]>; profile: HomeContent["profile"]; sectionCount: number };

export function Hero({ settings, profile, sectionCount }: Props) {
  return (
    <header className="hero" id="top">
      <div className="pt" aria-hidden={profile?.image ? undefined : true}>
        {profile?.image ? (
          <Image src={profile.image.url} alt={profile.image.alt || profile.fullName} fill priority sizes="66vw" />
        ) : (
          <div className="beam" />
        )}
      </div>
      <div className="wrap tx">
        <span className="mono">{settings.heroEyebrow}</span>
        <h1>
          <Multiline text={settings.heroHeadline} />
        </h1>
        <p>{settings.heroDescription}</p>
        <div className="bt">
          <a className="btn w" href="#work">
            {settings.heroPrimaryCtaLabel} <span aria-hidden="true">→</span>
          </a>
          <a className="btn" href="#about">
            {settings.heroSecondaryCtaLabel}
          </a>
        </div>
      </div>
      <div className="sc mono" aria-hidden="true">
        <i />
        Scroll to explore
      </div>
      <div className="pg mono" aria-hidden="true">
        <span>01</span>
        <span>{String(sectionCount).padStart(2, "0")}</span>
      </div>
      <div className="nm mono" aria-hidden="true">
        {settings.footerNote.replace(/michael wijaya/i, "MW")}
      </div>
    </header>
  );
}
