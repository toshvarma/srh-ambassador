"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useCapabilities } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import styles from "@/app/page.module.css";

export default function HomeClient() {
  const { locale } = useLocale();
  const capabilities = useCapabilities();

  const cards = [
    { href: "/news", title: t(locale, "latestNews"), body: "Read campus updates in English and German." },
    { href: "/events", title: t(locale, "upcomingEvents"), body: "Discover and join upcoming SRH events." },
    { href: "/clubs", title: t(locale, "ourClubs"), body: "Browse approved clubs and student initiatives." },
    { href: "/users", title: t(locale, "studentDirectory"), body: "Find students, ambassadors, and faculty contacts." },
  ];

  return (
    <section className={styles.hero}>
      <header className={styles.heroHeader}>
        <h1>{t(locale, "welcomeTitle")}</h1>
        <p className={styles.heroBody}>{t(locale, "welcomeBody")}</p>
      </header>

      <div className={styles.quickActions}>
        <h2>{t(locale, "quickActions")}</h2>
        <div className={styles.cards}>
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className={styles.cardLink}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p>{card.body}</p>
            </Link>
          ))}
          {capabilities.canManageNews || capabilities.canManageEvents || capabilities.canManageClubs ? (
            <Link href="/manage" className={styles.cardLink}>
              <h3 className={styles.cardTitle}>{t(locale, "manageContent")}</h3>
              <p>Open role-based forms for News, Events, and Clubs.</p>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
