"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Cpu,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  Mail,
  Map,
  ScrollText,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";

const LINKS = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/projects", "Projects", FolderKanban],
  ["/admin/technologies", "Technologies", Cpu],
  ["/admin/milestones", "Milestones", Map],
  ["/admin/experience", "Experience", Briefcase],
  ["/admin/education", "Education", BookOpen],
  ["/admin/skills", "Skills", Sparkles],
  ["/admin/certifications", "Certifications", Award],
  ["/admin/profile", "Profile", User],
  ["/admin/social-links", "Social links", Link2],
  ["/admin/settings", "Site copy & SEO", Settings],
  ["/admin/media", "Media", ImageIcon],
  ["/admin/messages", "Messages", Mail],
  ["/admin/analytics", "Analytics", BarChart3],
  ["/admin/audit-logs", "Audit log", ScrollText],
  ["/admin/users", "Administrators", Users],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin">
      {LINKS.map(([href, label, Icon]) => {
        const current = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={current ? "page" : undefined}>
            <Icon size={15} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
