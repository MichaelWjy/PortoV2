import type { HomeContent } from "@/lib/services/public";
import { ContactForm } from "./ContactForm";
import { Multiline } from "./Multiline";
import { SocialIcon } from "./SocialIcon";

type Props = { settings: NonNullable<HomeContent["settings"]>; socialLinks: HomeContent["socialLinks"] };

export function ContactSection({ settings, socialLinks }: Props) {
  return (
    <section className="s tight" id="contact" aria-labelledby="contact-title">
      <div className="wrap ct2">
        <div>
          <h2 className="h" id="contact-title">
            <Multiline text={settings.contactHeadline} />
          </h2>
          <p className="lead">{settings.contactDescription}</p>
          {socialLinks.length > 0 && (
            <ul aria-label="Elsewhere">
              {socialLinks.map((s) => {
                const external = s.url.startsWith("http");
                return (
                  <li key={s.id}>
                    <a href={s.url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={`${s.platform}: ${s.label}`}>
                      <i aria-hidden="true">
                        <SocialIcon url={s.url} fallback={s.icon ?? s.platform.slice(0, 2).toLowerCase()} />
                      </i>
                      {s.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
