"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { roleLabels } from "@/lib/roles";
import { fetchStrapiCollection, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import styles from "./ProfilePage.module.css";

type UserProfile = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  avatar?: { url?: string } | null;
};

type Club = {
  documentId?: string;
  slug?: string;
  title?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  ambassadorFeedback?: string;
  rejectionReason?: string;
  reviewedBy?: {
    documentId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

type ClubNotification = {
  clubTitle: string;
  clubSlug?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  ambassadorFeedback?: string;
  rejectionReason?: string;
  reviewerName?: string;
  reviewerEmail?: string;
};
type EventItem = { documentId?: string };
type NewsItem = { documentId?: string };

function NotifRow({ n, locale }: { n: ClubNotification; locale: "en" | "de" }) {
  const [expanded, setExpanded] = useState(false);
  const en = locale === "en";

  const summary =
    n.approvalStatus === "approved"
      ? (en ? `Your club "${n.clubTitle}" was approved.` : `Ihr Club „${n.clubTitle}" wurde genehmigt.`)
      : n.approvalStatus === "rejected"
        ? (en ? `Your club "${n.clubTitle}" was rejected.` : `Ihr Club „${n.clubTitle}" wurde abgelehnt.`)
        : (en ? `Your club "${n.clubTitle}" is awaiting review.` : `Ihr Club „${n.clubTitle}" wartet auf Prüfung.`);

  return (
    <li className={styles.notifItem}>
      <div className={styles.notifRow}>
        <div className={styles.notifBadgeCol}>
          <span className={styles.notifBadge} data-status={n.approvalStatus}>
            {n.approvalStatus === "approved"
              ? (en ? "✓ Approved" : "✓ Genehmigt")
              : n.approvalStatus === "rejected"
                ? (en ? "✕ Rejected" : "✕ Abgelehnt")
                : (en ? "⏳ Pending" : "⏳ Ausstehend")}
          </span>
        </div>
        <div className={styles.notifContent}>
          <span className={styles.notifSummary}>{summary}</span>
          {(n.rejectionReason || n.ambassadorFeedback || n.reviewerName) ? (
            <button
              type="button"
              className={styles.notifToggle}
              onClick={() => setExpanded((x) => !x)}
              aria-expanded={expanded}
            >
              {expanded ? (en ? "Close" : "Schließen") : (en ? "Read more" : "Mehr lesen")}
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className={styles.notifExpanded}>
          {n.rejectionReason ? (
            <div className={styles.notifDetail}>
              <span className={styles.notifLabel}>{en ? "Reason:" : "Grund:"}</span>
              <p>{n.rejectionReason}</p>
            </div>
          ) : null}
          {n.ambassadorFeedback ? (
            <div className={styles.notifDetail}>
              <span className={styles.notifLabel}>{en ? "Feedback:" : "Feedback:"}</span>
              <p>{n.ambassadorFeedback}</p>
            </div>
          ) : null}
          {n.reviewerName ? (
            <div className={styles.notifReviewer}>
              <span className={styles.notifLabel}>{en ? "Reviewed by:" : "Geprüft von:"}</span>
              {" "}{n.reviewerName}
              {n.reviewerEmail ? (
                <> · <a href={`mailto:${n.reviewerEmail}`} className={styles.notifEmail}>{n.reviewerEmail}</a></>
              ) : null}
            </div>
          ) : (
            <p className={styles.notifPending}>
              {en ? "Awaiting ambassador review." : "Warte auf Ambassador-Prüfung."}
            </p>
          )}
          {n.clubSlug ? (
            <Link href={`/clubs/${n.clubSlug}`} className={styles.notifClubLink}>
              {en ? "View club page →" : "Club-Seite ansehen →"}
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function ProfilePage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();

  const [profile, setProfile] = useState<StrapiEntry<UserProfile> | null>(null);
  const [clubs, setClubs] = useState<Array<StrapiEntry<Club>>>([]);
  const [notifications, setNotifications] = useState<ClubNotification[]>([]);
  const [joinedEventsCount, setJoinedEventsCount] = useState(0);
  const [authoredNewsCount, setAuthoredNewsCount] = useState(0);
  const [authoredEventsCount, setAuthoredEventsCount] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!auth?.token || !auth.profile?.documentId) return;
    try {
      setLoading(true);
      const nextWarnings: string[] = [];
      const profileId = auth.profile.documentId;

      try {
        const users = await fetchStrapiCollection<UserProfile>("/users", {
          token: auth.token,
          query: {
            "filters[documentId][$eq]": profileId,
            "populate[0]": "avatar",
            "pagination[limit]": 1,
          },
        });
        setProfile(users[0] ?? null);
      } catch {
        setProfile(null);
        nextWarnings.push(
          locale === "en"
            ? "Extended profile details could not be loaded."
            : "Erweiterte Profildetails konnten nicht geladen werden."
        );
      }

      try {
        const memberships = await fetchStrapiCollection<Club>("/clubs", {
          locale,
          token: auth.token,
          query: {
            "filters[members][documentId][$eq]": profileId,
            "sort[0]": "title:asc",
          },
        });
        setClubs(memberships);
      } catch {
        setClubs([]);
        nextWarnings.push(
          locale === "en"
            ? "Club memberships could not be loaded."
            : "Club-Mitgliedschaften konnten nicht geladen werden."
        );
      }

      try {
        const submissions = await fetchStrapiCollection<Club>("/clubs", {
          locale,
          token: auth.token,
          query: {
            "filters[submittedBy][documentId][$eq]": profileId,
            "sort[0]": "updatedAt:desc",
            "pagination[limit]": 20,
            "populate[0]": "reviewedBy",
          },
        });
        const noticeItems: ClubNotification[] = submissions.map((club) => {
          const reviewerName = club.reviewedBy
            ? `${club.reviewedBy.firstName ?? ""} ${club.reviewedBy.lastName ?? ""}`.trim() || undefined
            : undefined;
          return {
            clubTitle: club.title ?? "",
            clubSlug: club.slug ?? club.documentId,
            approvalStatus: club.approvalStatus ?? "pending",
            ambassadorFeedback: club.ambassadorFeedback?.trim() || undefined,
            rejectionReason: club.rejectionReason?.trim() || undefined,
            reviewerName,
            reviewerEmail: club.reviewedBy?.email || undefined,
          };
        });
        setNotifications(noticeItems);
      } catch {
        setNotifications([]);
      }

      try {
        const joinedEvents = await fetchStrapiCollection<EventItem>("/events", {
          locale,
          token: auth.token,
          query: {
            "filters[attendees][documentId][$eq]": profileId,
            "pagination[limit]": 200,
          },
        });
        setJoinedEventsCount(joinedEvents.length);
      } catch {
        setJoinedEventsCount(0);
      }

      if (capabilities.canManageNews) {
        try {
          const authoredNews = await fetchStrapiCollection<NewsItem>("/news-items", {
            locale,
            token: auth.token,
            query: {
              "filters[author][documentId][$eq]": profileId,
              "pagination[limit]": 200,
            },
          });
          setAuthoredNewsCount(authoredNews.length);
        } catch {
          setAuthoredNewsCount(0);
        }
      } else {
        setAuthoredNewsCount(0);
      }

      if (capabilities.canManageEvents) {
        try {
          const authoredEvents = await fetchStrapiCollection<EventItem>("/events", {
            locale,
            token: auth.token,
            query: {
              "filters[author][documentId][$eq]": profileId,
              "pagination[limit]": 200,
            },
          });
          setAuthoredEventsCount(authoredEvents.length);
        } catch {
          setAuthoredEventsCount(0);
        }
      } else {
        setAuthoredEventsCount(0);
      }

      setWarnings(nextWarnings);
    } finally {
      setLoading(false);
    }
  }, [auth, capabilities.canManageEvents, capabilities.canManageNews, locale]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const roleText = useMemo(() => {
    if (!auth?.appRole) return locale === "en" ? "Member" : "Mitglied";
    return roleLabels[auth.appRole][locale];
  }, [auth?.appRole, locale]);

  if (!auth) {
    return <section className={styles.page}><p className={styles.notice}>{locale === "en" ? "Please sign in." : "Bitte anmelden."}</p></section>;
  }

  if (loading) return <section className={styles.page}><p>{locale === "en" ? "Loading..." : "Wird geladen..."}</p></section>;

  const name = `${profile?.firstName ?? auth.profile?.firstName ?? ""} ${profile?.lastName ?? auth.profile?.lastName ?? ""}`.trim();
  const email = profile?.email ?? auth.profile?.email ?? auth.user.email;
  const avatarUrl = strapiMediaUrl(profile?.avatar?.url);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name || "Profile"} className={styles.avatar} />
        ) : (
          <div className={styles.avatarFallback}>{(name || email).slice(0, 1).toUpperCase()}</div>
        )}
        <div>
          <h1>{name || email}</h1>
          <p>{email}</p>
          <p>{roleText}</p>
        </div>
      </header>

      {warnings.length > 0 ? (
        <div className={styles.notice}>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className={styles.grid}>
        <article className={styles.card}>
          <h2>{locale === "en" ? "My Clubs" : "Meine Clubs"}</h2>
          {clubs.length === 0 ? (
            <p>{locale === "en" ? "No club memberships yet." : "Noch keine Club-Mitgliedschaften."}</p>
          ) : (
            <ul>
              {clubs.map((club) => (
                <li key={club.documentId ?? club.id}>
                  <Link href={`/clubs/${club.slug ?? club.documentId ?? club.id ?? ""}`}>{club.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={`${styles.card} ${styles.cardFullWidth}`}>
          <h2>{locale === "en" ? "Notifications" : "Benachrichtigungen"}</h2>
          {notifications.length === 0 ? (
            <p>{locale === "en" ? "No notifications yet." : "Noch keine Benachrichtigungen."}</p>
          ) : (
            <ul className={styles.notifList}>
              {notifications.map((n) => (
                <NotifRow key={n.clubTitle + n.approvalStatus} n={n} locale={locale} />
              ))}
            </ul>
          )}
        </article>

        <article className={styles.card}>
          <h2>{locale === "en" ? "Activity Snapshot" : "Aktivitätsüberblick"}</h2>
          <p>{locale === "en" ? "Joined events" : "Teilgenommene Events"}: {joinedEventsCount}</p>
          {capabilities.canManageNews ? <p>{locale === "en" ? "Authored news" : "Erstellte News"}: {authoredNewsCount}</p> : null}
          {capabilities.canManageEvents ? <p>{locale === "en" ? "Authored events" : "Erstellte Events"}: {authoredEventsCount}</p> : null}
        </article>
      </div>
    </section>
  );
}
