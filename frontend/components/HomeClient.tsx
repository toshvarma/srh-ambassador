"use client";

import Link from "next/link";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import styles from "@/app/page.module.css";

export default function HomeClient() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();
  const isGuest = !auth;

  const cards = isGuest
    ? [
        { href: "/events", title: t(locale, "upcomingEvents"), body: "Browse public events available to guests." },
      ]
    : [
        { href: "/news", title: t(locale, "latestNews"), body: "Read campus updates in English and German." },
        { href: "/events", title: t(locale, "upcomingEvents"), body: "Discover and join upcoming SRH events." },
        { href: "/clubs", title: t(locale, "ourClubs"), body: "Browse approved clubs and student initiatives." },
      ];

  return (
    <section className={styles.hero}>
      <header className={styles.heroHeader}>
        <h1>{t(locale, "welcomeTitle")}</h1>
        <p className={styles.heroBody}>
          {isGuest
            ? locale === "en"
              ? "Guest access allows viewing Home and public Events only."
              : "Gastzugang erlaubt nur Startseite und öffentliche Events."
            : t(locale, "welcomeBody")}
        </p>
      </header>

      <div className={styles.quickActions}>
        <h2>{t(locale, "quickActions")}</h2>
        {isGuest ? (
          <div className={styles.cards}>
            <article className={styles.cardLink}>
              <h3 className={styles.cardTitle}>{locale === "en" ? "Guest access includes" : "Gastzugang enthält"}</h3>
              <p>{locale === "en" ? "Home overview and public events with details." : "Startübersicht und öffentliche Events mit Details."}</p>
            </article>
            <article className={styles.cardLink}>
              <h3 className={styles.cardTitle}>{locale === "en" ? "Sign in required for" : "Anmeldung erforderlich für"}</h3>
              <p>{locale === "en" ? "News, Clubs, Profile, Manage, and all interactive actions." : "News, Clubs, Profil, Verwaltung und alle interaktiven Aktionen."}</p>
            </article>
          </div>
        ) : null}
        <div className={styles.cards}>
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className={styles.cardLink}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p>{card.body}</p>
            </Link>
          ))}
          {!isGuest && (capabilities.canManageNews || capabilities.canManageEvents || capabilities.canApproveClubIdea) ? (
            <Link href="/manage" className={styles.cardLink}>
              <h3 className={styles.cardTitle}>{t(locale, "manageContent")}</h3>
              <p>Create News, create Events, and review Club submissions.</p>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
