"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { guestPublicEvents } from "@/lib/guestEvents";
import { t } from "@/lib/i18n";
import { fetchStrapiCollection, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import styles from "./EventsPage.module.css";

type EventAttendee = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
};

type Event = {
  documentId?: string;
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  authorName?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  thumbnailUrl?: string;
  tags?: Array<{ documentId?: string; id?: number; name?: string; title?: string }>;
  club?: { documentId?: string; title?: string } | null;
  attendees?: EventAttendee[];
  startDate?: string;
  endDate?: string;
};

export default function EventsPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();

  const [events, setEvents] = useState<Array<StrapiEntry<Event>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [myClubFilter, setMyClubFilter] = useState(false);
  const [myClubIds, setMyClubIds] = useState<string[]>([]);
  const pageSize = 6;
  const isGuestViewer = !auth;

  useEffect(() => {
    if (!auth?.token || !auth.profile?.documentId) return;
    const profileId = auth.profile.documentId;
    void fetchStrapiCollection<{ documentId?: string }>(
      `/clubs?filters[members][documentId][$eq]=${profileId}&pagination[limit]=50`,
      { token: auth.token }
    ).then((clubs) => {
      setMyClubIds(clubs.map((club) => club.documentId).filter((id): id is string => Boolean(id)));
    }).catch(() => undefined);
  }, [auth?.token, auth?.profile?.documentId]);

  const fetchEvents = useCallback(
    async (nextPage: number, clubFilter: boolean) => {
      try {
        setLoading(true);
        setError(null);
        const query: Record<string, string | number | undefined> = {
          "pagination[page]": nextPage,
          "pagination[pageSize]": pageSize,
          "sort[0]": "start_datetime:asc",
          "populate[0]": "club",
          "populate[1]": "attendees",
        };
        if (clubFilter && myClubIds.length > 0) {
          myClubIds.forEach((id, index) => {
            query[`filters[club][documentId][$in][${index}]`] = id;
          });
        }
        const data = await fetchStrapiCollection<Event>("/events", {
          locale,
          token: auth?.token,
          query,
        });
        setEvents(data.length > 0 ? data : isGuestViewer ? guestPublicEvents : data);
      } catch (err) {
        if (isGuestViewer) {
          setEvents(guestPublicEvents);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : t(locale, "unknownError"));
        }
      } finally {
        setLoading(false);
      }
    },
    [auth, isGuestViewer, locale, myClubIds]
  );

  useEffect(() => {
    void fetchEvents(page, myClubFilter);
  }, [fetchEvents, page, myClubFilter]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => {
      const first = a.start_datetime ? new Date(a.start_datetime).getTime() : Number.MAX_SAFE_INTEGER;
      const second = b.start_datetime ? new Date(b.start_datetime).getTime() : Number.MAX_SAFE_INTEGER;
      return first - second;
    }),
    [events]
  );

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;

  return (
    <div className={styles.eventsPage}>
      <aside className={styles.sidebar}>
        <h1>{t(locale, "upcomingEvents")}</h1>
        {isGuestViewer ? (
          <p className={styles.sideHint}>
            {locale === "en"
              ? "You are browsing public events as a guest."
              : "Sie sehen öffentliche Veranstaltungen als Gast."}
          </p>
        ) : null}
        <div className={styles.sideSection}>
          <h2>{locale === "en" ? "All Events" : "Alle Veranstaltungen"}</h2>
          <button
            type="button"
            className={`${styles.filterButton} ${!myClubFilter ? styles.filterButtonActive : ""}`}
            onClick={() => { setMyClubFilter(false); setPage(1); }}
          >
            {locale === "en" ? "All Events" : "Alle Veranstaltungen"}
          </button>
        </div>
        <div className={styles.sideSection}>
          <h2>{locale === "en" ? "Filter" : "Filter"}</h2>
          {!isGuestViewer && myClubIds.length > 0 ? (
            <button
              type="button"
              className={`${styles.filterButton} ${myClubFilter ? styles.filterButtonActive : ""}`}
              onClick={() => { setMyClubFilter(true); setPage(1); }}
            >
              {locale === "en" ? "My Club Events" : "Meine Club-Veranstaltungen"}
            </button>
          ) : !isGuestViewer ? (
            <p className={styles.sideHint}>
              {locale === "en"
                ? "No personal club filter available yet."
                : "Noch kein persönlicher Club-Filter verfügbar."}
            </p>
          ) : (
            <p className={styles.sideHint}>
              {locale === "en"
                ? "Sign in to unlock personal club filters and event signups."
                : "Melden Sie sich an, um persönliche Club-Filter und Event-Anmeldungen zu nutzen."}
            </p>
          )}
        </div>
      </aside>

      <section className={styles.content}>
        {error ? <div className={styles.error}>{error}</div> : null}

        {sortedEvents.length === 0 ? (
          <div className={styles.noEvents}>{t(locale, "noData")}</div>
        ) : (
          <>
            <div className={styles.eventsGrid}>
              {sortedEvents.map((event) => {
                const start = event.start_datetime ? new Date(event.start_datetime) : null;
                const end = event.end_datetime ? new Date(event.end_datetime) : null;
                const normalizedStart = start ?? (event.startDate ? new Date(event.startDate) : null);
                const normalizedEnd = end ?? (event.endDate ? new Date(event.endDate) : null);
                const attendeeIds = (event.attendees ?? [])
                  .map((attendee) => attendee.documentId)
                  .filter((id): id is string => typeof id === "string");
                const eventTags = (event.tags ?? [])
                  .map((tag) => (tag.name ?? tag.title ?? "").trim())
                  .filter((tag) => tag && tag.toLowerCase() !== "root");
                return (
                  <article key={event.documentId ?? event.id} className={styles.eventCard}>
                    {event.thumbnailUrl ? (
                      <img
                        src={strapiMediaUrl(event.thumbnailUrl) ?? event.thumbnailUrl}
                        alt={event.title ?? "Event"}
                        className={styles.eventImage}
                      />
                    ) : (
                      <div className={styles.eventImagePlaceholder} />
                    )}
                    <div className={styles.eventBody}>
                      {event.club?.title ? <span className={styles.clubBadge}>{event.club.title}</span> : null}
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      <p className={styles.eventDescription}>
                        {event.shortDescription
                          ?? (event.description
                            ? `${event.description.slice(0, 140)}…`
                            : (event.title ?? ""))}
                      </p>
                      {eventTags.length > 0 ? (
                        <div className={styles.tagList}>
                          {eventTags.map((tag) => (
                            <span key={`${event.documentId ?? event.id}-${tag}`} className={styles.tagChip}>
                             {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className={styles.eventAuthor}>
                        {locale === "en" ? "Author" : "Autor"}: {event.authorName || "SRH Team"}
                      </p>
                      <p className={styles.eventMeta}>
                        {event.location ? `📍 ${event.location}` : ""}
                        {normalizedStart
                          ? ` · ${normalizedStart.toLocaleString(locale === "en" ? "en-US" : "de-DE", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                        {normalizedEnd
                          ? ` - ${normalizedEnd.toLocaleTimeString(locale === "en" ? "en-US" : "de-DE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                      <p className={styles.eventMeta}>
                        {locale === "en" ? "Attendees" : "Teilnehmende"}: {attendeeIds.length}
                      </p>
                      <div className={styles.cardActions}>
                        <Link
                          href={`/events/${event.slug ?? event.documentId ?? event.id ?? ""}`}
                          className={styles.readMoreButton}
                        >
                          {locale === "en" ? "Read more" : "Mehr lesen"}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.pagination}>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                Prev
              </button>
              <span>{page}</span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={events.length < pageSize || isGuestViewer}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
