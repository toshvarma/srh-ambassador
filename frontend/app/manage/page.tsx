"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import {
  createStrapiEntry,
  deleteStrapiEntry,
  fetchStrapiCollection,
  updateStrapiEntry,
  type StrapiEntry,
} from "@/lib/strapi";
import styles from "./manage.module.css";

type NewsItem = {
  documentId?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  status?: "draft" | "published" | "archived";
};

type EventItem = {
  documentId?: string;
  title?: string;
  description?: string;
  location?: string;
  start_datetime?: string;
  end_datetime?: string;
};

type ClubItem = {
  documentId?: string;
  title?: string;
  description?: string;
  contact_email?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
};

export default function ManagePage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const permissions = useCapabilities();

  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<Array<StrapiEntry<NewsItem>>>([]);
  const [events, setEvents] = useState<Array<StrapiEntry<EventItem>>>([]);
  const [clubs, setClubs] = useState<Array<StrapiEntry<ClubItem>>>([]);

  const [newsInput, setNewsInput] = useState({ title: "", excerpt: "", content: "" });
  const [eventInput, setEventInput] = useState({
    title: "",
    description: "",
    location: "",
    start_datetime: "",
    end_datetime: "",
  });
  const [clubInput, setClubInput] = useState({ title: "", description: "", contact_email: "" });

  const canManageAny = useMemo(
    () => permissions.canManageNews || permissions.canManageEvents || permissions.canManageClubs,
    [permissions]
  );

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [newsItems, eventItems, clubItems] = await Promise.all([
        fetchStrapiCollection<NewsItem>("/news-items", { locale, token: auth?.token }),
        fetchStrapiCollection<EventItem>("/events", { locale, token: auth?.token }),
        fetchStrapiCollection<ClubItem>("/clubs", { locale, token: auth?.token }),
      ]);
      setNews(newsItems);
      setEvents(eventItems);
      setClubs(clubItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    }
  }, [auth, locale]);

  useEffect(() => {
    void loadAll();
  }, [canManageAny, loadAll]);

  if (!auth || !canManageAny) {
    return (
      <section className={styles.container}>
        <h1>{t(locale, "manageTitle")}</h1>
        <p className={styles.notice}>
          {locale === "en"
            ? "You need an authorized role (Ambassador, Teacher, Professor, Admin, or SuperAdmin)."
            : "Sie benötigen eine berechtigte Rolle (Botschafter, Lehrer, Professor, Admin oder SuperAdmin)."}
        </p>
      </section>
    );
  }

  async function createNews(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissions.canManageNews || !auth?.token) return;
    await createStrapiEntry("/news-items", { ...newsInput, status: "draft" }, { token: auth.token, locale });
    setNewsInput({ title: "", excerpt: "", content: "" });
    await loadAll();
  }

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissions.canManageEvents || !auth?.token) return;
    await createStrapiEntry("/events", eventInput, { token: auth.token, locale });
    setEventInput({ title: "", description: "", location: "", start_datetime: "", end_datetime: "" });
    await loadAll();
  }

  async function createClub(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!permissions.canManageClubs && !permissions.canSubmitClubIdea) || !auth?.token) return;
    await createStrapiEntry(
      "/clubs",
      { ...clubInput, approvalStatus: permissions.canApproveClubIdea ? "approved" : "pending" },
      { token: auth.token, locale }
    );
    setClubInput({ title: "", description: "", contact_email: "" });
    await loadAll();
  }

  async function removeEntry(apiPath: string, documentId: string | undefined) {
    if (!documentId || !auth?.token) return;
    await deleteStrapiEntry(`${apiPath}/${documentId}`, { token: auth.token, locale });
    await loadAll();
  }

  async function updateClubStatus(documentId: string | undefined, approvalStatus: "approved" | "rejected") {
    if (!documentId || !permissions.canApproveClubIdea || !auth?.token) return;
    await updateStrapiEntry(`/clubs/${documentId}`, { approvalStatus }, { token: auth.token, locale });
    await loadAll();
  }

  return (
    <section className={styles.container}>
      <h1>{t(locale, "manageTitle")}</h1>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.grid}>
        {permissions.canManageNews ? (
          <section className={styles.section}>
            <h2>{t(locale, "latestNews")}</h2>
            <form className={styles.form} onSubmit={createNews}>
              <input
                placeholder={t(locale, "title")}
                value={newsInput.title}
                onChange={(event) => setNewsInput((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <input
                placeholder={t(locale, "excerpt")}
                value={newsInput.excerpt}
                onChange={(event) => setNewsInput((current) => ({ ...current, excerpt: event.target.value }))}
                required
              />
              <textarea
                placeholder={t(locale, "content")}
                value={newsInput.content}
                onChange={(event) => setNewsInput((current) => ({ ...current, content: event.target.value }))}
                rows={4}
                required
              />
              <button type="submit">{t(locale, "create")}</button>
            </form>
            {news.map((item) => (
              <article key={item.documentId || item.id} className={styles.item}>
                <strong>{item.title}</strong>
                <p>{item.excerpt}</p>
                <div className={styles.itemActions}>
                  <button className={styles.danger} type="button" onClick={() => removeEntry("/news-items", item.documentId)}>
                    {t(locale, "delete")}
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {permissions.canManageEvents ? (
          <section className={styles.section}>
            <h2>{t(locale, "upcomingEvents")}</h2>
            <form className={styles.form} onSubmit={createEvent}>
              <input
                placeholder={t(locale, "title")}
                value={eventInput.title}
                onChange={(event) => setEventInput((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <textarea
                placeholder={t(locale, "description")}
                value={eventInput.description}
                onChange={(event) => setEventInput((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                required
              />
              <input
                placeholder={t(locale, "location")}
                value={eventInput.location}
                onChange={(event) => setEventInput((current) => ({ ...current, location: event.target.value }))}
                required
              />
              <input
                type="datetime-local"
                value={eventInput.start_datetime}
                onChange={(event) => setEventInput((current) => ({ ...current, start_datetime: event.target.value }))}
                required
              />
              <input
                type="datetime-local"
                value={eventInput.end_datetime}
                onChange={(event) => setEventInput((current) => ({ ...current, end_datetime: event.target.value }))}
                required
              />
              <button type="submit">{t(locale, "create")}</button>
            </form>
            {events.map((item) => (
              <article key={item.documentId || item.id} className={styles.item}>
                <strong>{item.title}</strong>
                <p>{item.location}</p>
                <div className={styles.itemActions}>
                  <button className={styles.danger} type="button" onClick={() => removeEntry("/events", item.documentId)}>
                    {t(locale, "delete")}
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {permissions.canManageClubs || permissions.canSubmitClubIdea ? (
          <section className={styles.section}>
            <h2>{t(locale, "ourClubs")}</h2>
            <form className={styles.form} onSubmit={createClub}>
              <input
                placeholder={t(locale, "title")}
                value={clubInput.title}
                onChange={(event) => setClubInput((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <textarea
                placeholder={t(locale, "description")}
                value={clubInput.description}
                onChange={(event) => setClubInput((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                required
              />
              <input
                type="email"
                placeholder={t(locale, "contactEmail")}
                value={clubInput.contact_email}
                onChange={(event) => setClubInput((current) => ({ ...current, contact_email: event.target.value }))}
                required
              />
              <button type="submit">{permissions.canApproveClubIdea ? t(locale, "create") : t(locale, "submitClubIdea")}</button>
            </form>
            {clubs.map((item) => (
              <article key={item.documentId || item.id} className={styles.item}>
                <strong>{item.title}</strong>
                <p>
                  {t(locale, "status")}: {item.approvalStatus || "pending"}
                </p>
                <div className={styles.itemActions}>
                  {permissions.canApproveClubIdea ? (
                    <>
                      <button className={styles.success} type="button" onClick={() => updateClubStatus(item.documentId, "approved")}>
                        {t(locale, "approve")}
                      </button>
                      <button className={styles.warning} type="button" onClick={() => updateClubStatus(item.documentId, "rejected")}>
                        {t(locale, "reject")}
                      </button>
                    </>
                  ) : null}
                  {permissions.canManageClubs ? (
                    <button className={styles.danger} type="button" onClick={() => removeEntry("/clubs", item.documentId)}>
                      {t(locale, "delete")}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </section>
  );
}
