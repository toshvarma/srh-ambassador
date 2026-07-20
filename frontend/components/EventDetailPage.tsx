"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { guestPublicEvents } from "@/lib/guestEvents";
import { t } from "@/lib/i18n";
import { fetchStrapiCollection, strapiMediaUrl, updateStrapiEntry, type StrapiEntry } from "@/lib/strapi";
import styles from "./EventDetailPage.module.css";

type EventAttendee = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
};

type EventDetail = {
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
  club?: { documentId?: string; title?: string } | null;
  attendees?: EventAttendee[];
};

export default function EventDetailPage({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const [eventItem, setEventItem] = useState<StrapiEntry<EventDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState(false);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data = await fetchStrapiCollection<EventDetail>("/events", {
        locale,
        token: auth?.token,
        query: {
          "filters[slug][$eq]": slug,
          "populate[0]": "club",
          "populate[1]": "attendees",
        },
      });
      if (!data[0]) {
        data = await fetchStrapiCollection<EventDetail>("/events", {
          locale,
          token: auth?.token,
          query: {
            "filters[documentId][$eq]": slug,
            "populate[0]": "club",
            "populate[1]": "attendees",
          },
        });
      }
      if (data[0]) {
        setEventItem(data[0]);
      } else if (!auth) {
        const guestFallback =
          guestPublicEvents.find((event) => event.slug === slug || event.documentId === slug) ?? null;
        setEventItem(guestFallback);
      } else {
        setEventItem(null);
      }
    } catch (err) {
      if (!auth) {
        const guestFallback =
          guestPublicEvents.find((event) => event.slug === slug || event.documentId === slug) ?? null;
        if (guestFallback) {
          setEventItem(guestFallback);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : t(locale, "unknownError"));
        }
      } else {
        setError(err instanceof Error ? err.message : t(locale, "unknownError"));
      }
    } finally {
      setLoading(false);
    }
  }, [auth, locale, slug]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  async function signupForEvent() {
    if (!eventItem?.documentId || !auth?.token || !auth.profile?.documentId) return;
    const attendeeIds = (eventItem.attendees ?? [])
      .map((attendee) => attendee.documentId)
      .filter((id): id is string => Boolean(id));
    if (attendeeIds.includes(auth.profile.documentId)) return;

    try {
      setSigningUp(true);
      await updateStrapiEntry(
        `/events/${eventItem.documentId}`,
        { attendees: [...attendeeIds, auth.profile.documentId] },
        { token: auth.token, locale }
      );
      await loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSigningUp(false);
    }
  }

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!eventItem) return <div className={styles.error}>{locale === "en" ? "Event not found." : "Veranstaltung nicht gefunden."}</div>;

  const start = eventItem.start_datetime ? new Date(eventItem.start_datetime) : null;
  const end = eventItem.end_datetime ? new Date(eventItem.end_datetime) : null;
  const attendeeIds = (eventItem.attendees ?? [])
    .map((attendee) => attendee.documentId)
    .filter((id): id is string => Boolean(id));
  const joined = auth?.profile?.documentId ? attendeeIds.includes(auth.profile.documentId) : false;

  return (
    <article className={styles.detailPage}>
      <Link href="/events" className={styles.backLink}>
        {locale === "en" ? "← Back to Events" : "← Zurück zu Veranstaltungen"}
      </Link>

      {eventItem.thumbnailUrl ? (
        <img
          src={strapiMediaUrl(eventItem.thumbnailUrl) ?? eventItem.thumbnailUrl}
          alt={eventItem.title ?? "Event"}
          className={styles.heroImage}
        />
      ) : null}

      <h1>{eventItem.title}</h1>
      <p className={styles.meta}>
        {eventItem.club?.title ? `${eventItem.club.title} · ` : ""}
        {eventItem.authorName || "SRH Team"}
      </p>
      <p className={styles.meta}>
        {start ? start.toLocaleString(locale === "en" ? "en-US" : "de-DE") : ""}
        {end ? ` - ${end.toLocaleString(locale === "en" ? "en-US" : "de-DE")}` : ""}
      </p>
      <p className={styles.meta}>{eventItem.location ? `📍 ${eventItem.location}` : ""}</p>

      <section className={styles.body}>
        <h2>{locale === "en" ? "Details" : "Details"}</h2>
        {eventItem.shortDescription ? <p>{eventItem.shortDescription}</p> : null}
        <ReactMarkdown>{eventItem.description ?? ""}</ReactMarkdown>
      </section>

      <section className={styles.body}>
        <h2>{locale === "en" ? "Attendance" : "Teilnahme"}</h2>
        <p>{locale === "en" ? "Registered attendees" : "Angemeldete Teilnehmende"}: {attendeeIds.length}</p>
        {auth?.profile?.documentId ? (
          <button
            type="button"
            className={styles.signupButton}
            disabled={joined || signingUp || !auth?.profile?.documentId}
            onClick={() => void signupForEvent()}
          >
            {joined
              ? locale === "en" ? "✓ Signed up" : "✓ Angemeldet"
              : signingUp
                ? t(locale, "loading")
                : locale === "en"
                  ? "Sign up"
                  : "Anmelden"}
          </button>
        ) : (
          <p className={styles.meta}>
            {locale === "en"
              ? "Sign in to register for this event."
              : "Melden Sie sich an, um sich für dieses Event anzumelden."}
          </p>
        )}
      </section>
    </article>
  );
}
