"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { createStrapiEntry, fetchStrapiCollection, type StrapiEntry } from "@/lib/strapi";
import styles from "./EventsPage.module.css";

type Event = {
  documentId?: string;
  title?: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  club?: { documentId?: string; title?: string } | null;
};

export default function EventsPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();

  const [events, setEvents] = useState<Array<StrapiEntry<Event>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eventInput, setEventInput] = useState({
    title: "",
    description: "",
    location: "",
    start_datetime: "",
    end_datetime: "",
  });
  const pageSize = 6;

  const fetchEvents = useCallback(
    async (nextPage: number) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStrapiCollection<Event>("/events?populate=club", {
          locale,
          token: auth?.token,
          query: {
            "pagination[page]": nextPage,
            "pagination[pageSize]": pageSize,
            "sort[0]": "start_datetime:asc",
          },
        });
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(locale, "unknownError"));
      } finally {
        setLoading(false);
      }
    },
    [auth, locale]
  );

  useEffect(() => {
    void fetchEvents(page);
  }, [fetchEvents, page]);

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth?.token) return;
    try {
      setSubmitting(true);
      await createStrapiEntry("/events", eventInput, { token: auth.token, locale });
      setEventInput({ title: "", description: "", location: "", start_datetime: "", end_datetime: "" });
      setShowForm(false);
      setPage(1);
      await fetchEvents(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;

  return (
    <div className={styles.eventsPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h1>{t(locale, "upcomingEvents")}</h1>
          {capabilities.canManageEvents ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setShowForm((s) => !s)}
            >
              {showForm
                ? locale === "en" ? "Cancel" : "Abbrechen"
                : locale === "en" ? "Create New" : "Neu erstellen"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {/* Create form */}
      {showForm ? (
        <form className={styles.createForm} onSubmit={createEvent}>
          <h2>{locale === "en" ? "Schedule a new event" : "Neue Veranstaltung planen"}</h2>
          <input
            value={eventInput.title}
            onChange={(e) => setEventInput((c) => ({ ...c, title: e.target.value }))}
            placeholder={t(locale, "title")}
            required
          />
          <textarea
            value={eventInput.description}
            onChange={(e) => setEventInput((c) => ({ ...c, description: e.target.value }))}
            placeholder={t(locale, "description")}
            rows={3}
            required
          />
          <input
            value={eventInput.location}
            onChange={(e) => setEventInput((c) => ({ ...c, location: e.target.value }))}
            placeholder={t(locale, "location")}
            required
          />
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              {t(locale, "startDate")}
              <input
                type="datetime-local"
                value={eventInput.start_datetime}
                onChange={(e) => setEventInput((c) => ({ ...c, start_datetime: e.target.value }))}
                required
              />
            </label>
            <label className={styles.formLabel}>
              {t(locale, "endDate")}
              <input
                type="datetime-local"
                value={eventInput.end_datetime}
                onChange={(e) => setEventInput((c) => ({ ...c, end_datetime: e.target.value }))}
                required
              />
            </label>
          </div>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting
              ? t(locale, "loading")
              : locale === "en" ? "Create Event" : "Veranstaltung erstellen"}
          </button>
        </form>
      ) : null}

      {/* Events list */}
      {events.length === 0 ? (
        <div className={styles.noEvents}>{t(locale, "noData")}</div>
      ) : (
        <>
          <div className={styles.eventsGrid}>
            {events.map((event) => {
              const start = event.start_datetime ? new Date(event.start_datetime) : null;
              return (
                <article key={event.documentId ?? event.id} className={styles.eventCard}>
                  <div className={styles.dateBlock}>
                    {start ? (
                      <>
                        <span className={styles.dateDay}>{start.getDate()}</span>
                        <span className={styles.dateMonth}>
                          {start.toLocaleString(locale === "en" ? "en-US" : "de-DE", { month: "short" })}
                        </span>
                      </>
                    ) : (
                      <span className={styles.dateDay}>—</span>
                    )}
                  </div>
                  <div className={styles.eventBody}>
                    {event.club?.title ? (
                      <span className={styles.clubBadge}>{event.club.title}</span>
                    ) : null}
                    <h3 className={styles.eventTitle}>{event.title}</h3>
                    <p className={styles.eventDescription}>{event.description}</p>
                    <p className={styles.eventMeta}>
                      {event.location ? `📍 ${event.location}` : ""}
                      {start
                        ? ` · ${start.toLocaleTimeString(locale === "en" ? "en-US" : "de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span>{page}</span>
            <button
              type="button"
              onClick={() => setPage((c) => c + 1)}
              disabled={events.length < pageSize}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
