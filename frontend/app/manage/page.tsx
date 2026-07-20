"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import {
  createStrapiEntry,
  fetchStrapiCollection,
  updateStrapiEntry,
  type StrapiEntry,
} from "@/lib/strapi";
import styles from "./manage.module.css";

type NewsCategory = { documentId?: string; name?: string };
type NewsTag = { documentId?: string; name?: string };

type ClubItem = {
  documentId?: string;
  id?: number;
  slug?: string;
  title?: string;
  shortDescription?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  submittedBy?: { firstName?: string; lastName?: string; email?: string } | null;
};

type SavedMeta = {
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  savedAt?: string;
};

function formatTime(locale: "en" | "de", value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "de-DE");
}

function readMeta(entry: unknown): Omit<SavedMeta, "savedAt"> {
  if (!entry || typeof entry !== "object") return {};
  const record = entry as Record<string, unknown>;
  return {
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    publishedAt: typeof record.publishedAt === "string" ? record.publishedAt : undefined,
  };
}

function injectMarkdown(
  textarea: HTMLTextAreaElement | null,
  prefix: string,
  suffix = "",
  fallback = "text"
) {
  if (!textarea) return null;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const value = textarea.value;
  const selected = value.slice(start, end) || fallback;
  const inserted = `${prefix}${selected}${suffix}`;
  const nextValue = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
  const caretStart = start + prefix.length;
  const caretEnd = caretStart + selected.length;
  return { nextValue, caretStart, caretEnd };
}

export default function ManagePage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const permissions = useCapabilities();

  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<"news" | "events" | "clubs">("news");
  const [categories, setCategories] = useState<Array<StrapiEntry<NewsCategory>>>([]);
  const [tags, setTags] = useState<Array<StrapiEntry<NewsTag>>>([]);
  const [clubs, setClubs] = useState<Array<StrapiEntry<ClubItem>>>([]);

  const [newsInput, setNewsInput] = useState({
    title: "",
    excerpt: "",
    content: "",
    featuredImageUrl: "",
    visibility: "all" as "all" | "student" | "professor",
    category: "",
    tagIds: [] as string[],
    courseLabel: "",
  });
  const [eventInput, setEventInput] = useState({
    title: "",
    shortDescription: "",
    description: "",
    location: "",
    start_datetime: "",
    end_datetime: "",
    thumbnailUrl: "",
    category: "",
    tagIds: [] as string[],
  });

  const [newsDraftId, setNewsDraftId] = useState<string | null>(null);
  const [eventDraftId, setEventDraftId] = useState<string | null>(null);
  const [newsMeta, setNewsMeta] = useState<SavedMeta>({});
  const [eventMeta, setEventMeta] = useState<SavedMeta>({});
  const [savingNews, setSavingNews] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const newsEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const eventEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const canAccessManage = useMemo(
    () =>
      permissions.canManageEvents || permissions.canManageNews || permissions.canApproveClubIdea,
    [permissions]
  );

  useEffect(() => {
    const nextMenu = permissions.canManageNews
      ? "news"
      : permissions.canManageEvents
        ? "events"
        : "clubs";
    setActiveMenu((current) => {
      if (current === "news" && permissions.canManageNews) return current;
      if (current === "events" && permissions.canManageEvents) return current;
      if (current === "clubs" && permissions.canApproveClubIdea) return current;
      return nextMenu;
    });
  }, [permissions.canApproveClubIdea, permissions.canManageEvents, permissions.canManageNews]);

  const loadManageData = useCallback(async () => {
    if (!auth?.token) return;

    setError(null);
    const nextWarnings: string[] = [];

    if (permissions.canManageNews || permissions.canManageEvents) {
      try {
        const data = await fetchStrapiCollection<NewsCategory>("/news-categories", {
          locale,
          token: auth.token,
          query: { "sort[0]": "name:asc" },
        });
        setCategories(data);
      } catch {
        setCategories([]);
        nextWarnings.push(
          locale === "en"
            ? "Categories could not be loaded with current permissions."
            : "Kategorien konnten mit den aktuellen Berechtigungen nicht geladen werden."
        );
      }

      try {
        const data = await fetchStrapiCollection<NewsTag>("/news-tags", {
          locale,
          token: auth.token,
          query: { "sort[0]": "name:asc" },
        });
        setTags(data);
      } catch {
        setTags([]);
        nextWarnings.push(
          locale === "en"
            ? "Tags could not be loaded with current permissions."
            : "Tags konnten mit den aktuellen Berechtigungen nicht geladen werden."
        );
      }
    } else {
      setCategories([]);
      setTags([]);
    }

    if (permissions.canApproveClubIdea) {
      try {
        const data = await fetchStrapiCollection<ClubItem>("/clubs", {
          locale,
          token: auth.token,
          query: {
            "filters[approvalStatus][$eq]": "pending",
            "sort[0]": "createdAt:desc",
            "populate[0]": "submittedBy",
          },
        });
        setClubs(data);
      } catch {
        setClubs([]);
        nextWarnings.push(
          locale === "en"
            ? "Club review list could not be loaded with current permissions."
            : "Die Club-Prüfliste konnte mit den aktuellen Berechtigungen nicht geladen werden."
        );
      }
    } else {
      setClubs([]);
    }

    setWarnings(nextWarnings);
  }, [auth, locale, permissions.canApproveClubIdea, permissions.canManageEvents, permissions.canManageNews]);

  useEffect(() => {
    void loadManageData();
  }, [loadManageData]);

  function applyRichText(target: "news" | "event", prefix: string, suffix = "", fallback = "text") {
    const ref = target === "news" ? newsEditorRef.current : eventEditorRef.current;
    const result = injectMarkdown(ref, prefix, suffix, fallback);
    if (!result) return;
    if (target === "news") {
      setNewsInput((current) => ({ ...current, content: result.nextValue }));
    } else {
      setEventInput((current) => ({ ...current, description: result.nextValue }));
    }
    requestAnimationFrame(() => {
      ref?.focus();
      ref?.setSelectionRange(result.caretStart, result.caretEnd);
    });
  }

  async function saveNewsDraft() {
    if (!permissions.canManageNews || !auth?.token) return;
    try {
      setSavingNews(true);
      setError(null);
      const payload = {
        title: newsInput.title,
        excerpt: newsInput.excerpt,
        content: newsInput.content,
        featuredImageUrl: newsInput.featuredImageUrl || null,
        visibility: newsInput.visibility,
        category: newsInput.category || null,
        tags: newsInput.tagIds,
        courseLabel: newsInput.courseLabel || null,
        status: "draft",
        publishedAt: null,
        author: auth.profile?.documentId ?? null,
      };
      const saved = newsDraftId
        ? await updateStrapiEntry(`/news-items/${newsDraftId}`, payload, { token: auth.token, locale })
        : await createStrapiEntry("/news-items", payload, { token: auth.token, locale });
      if (saved?.documentId) {
        setNewsDraftId(saved.documentId);
      }
      setNewsMeta({ ...readMeta(saved), savedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingNews(false);
    }
  }

  async function publishNews() {
    if (!permissions.canManageNews || !auth?.token) return;
    try {
      setSavingNews(true);
      setError(null);
      const payload = {
        title: newsInput.title,
        excerpt: newsInput.excerpt,
        content: newsInput.content,
        featuredImageUrl: newsInput.featuredImageUrl || null,
        visibility: newsInput.visibility,
        category: newsInput.category || null,
        tags: newsInput.tagIds,
        courseLabel: newsInput.courseLabel || null,
        status: "published",
        publishedAt: new Date().toISOString(),
        author: auth.profile?.documentId ?? null,
      };
      const saved = newsDraftId
        ? await updateStrapiEntry(`/news-items/${newsDraftId}`, payload, { token: auth.token, locale })
        : await createStrapiEntry("/news-items", payload, { token: auth.token, locale });
      if (saved?.documentId) {
        setNewsDraftId(saved.documentId);
      }
      setNewsMeta({ ...readMeta(saved), savedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingNews(false);
    }
  }

  async function saveEventDraft() {
    if (!permissions.canManageEvents || !auth?.token) return;
    try {
      setSavingEvent(true);
      setError(null);
      const authorName = auth.profile
        ? `${auth.profile.firstName ?? ""} ${auth.profile.lastName ?? ""}`.trim() || auth.user.email
        : auth.user.email;
      const payload = {
        title: eventInput.title,
        shortDescription: eventInput.shortDescription,
        description: eventInput.description,
        location: eventInput.location,
        start_datetime: eventInput.start_datetime || null,
        end_datetime: eventInput.end_datetime || null,
        thumbnailUrl: eventInput.thumbnailUrl || null,
        category: eventInput.category || null,
        tags: eventInput.tagIds,
        authorName,
        author: auth.profile?.documentId ?? null,
        publishedAt: null,
      };
      const saved = eventDraftId
        ? await updateStrapiEntry(`/events/${eventDraftId}`, payload, { token: auth.token, locale })
        : await createStrapiEntry("/events", payload, { token: auth.token, locale });
      if (saved?.documentId) {
        setEventDraftId(saved.documentId);
      }
      setEventMeta({ ...readMeta(saved), savedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingEvent(false);
    }
  }

  async function publishEvent() {
    if (!permissions.canManageEvents || !auth?.token) return;
    try {
      setSavingEvent(true);
      setError(null);
      const authorName = auth.profile
        ? `${auth.profile.firstName ?? ""} ${auth.profile.lastName ?? ""}`.trim() || auth.user.email
        : auth.user.email;
      const payload = {
        title: eventInput.title,
        shortDescription: eventInput.shortDescription,
        description: eventInput.description,
        location: eventInput.location,
        start_datetime: eventInput.start_datetime || null,
        end_datetime: eventInput.end_datetime || null,
        thumbnailUrl: eventInput.thumbnailUrl || null,
        category: eventInput.category || null,
        tags: eventInput.tagIds,
        authorName,
        author: auth.profile?.documentId ?? null,
        publishedAt: new Date().toISOString(),
      };
      const saved = eventDraftId
        ? await updateStrapiEntry(`/events/${eventDraftId}`, payload, { token: auth.token, locale })
        : await createStrapiEntry("/events", payload, { token: auth.token, locale });
      if (saved?.documentId) {
        setEventDraftId(saved.documentId);
      }
      setEventMeta({ ...readMeta(saved), savedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingEvent(false);
    }
  }

  if (!auth || !canAccessManage) {
    return (
      <section className={styles.container}>
        <h1>{t(locale, "manageTitle")}</h1>
        <p className={styles.notice}>
          {locale === "en"
            ? "This area is only available for users with management permissions."
            : "Dieser Bereich ist nur für Nutzer mit Verwaltungsrechten verfügbar."}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1>{t(locale, "manageTitle")}</h1>
        <p>
          {locale === "en"
            ? "Use menu-based workflows to create rich News and Events, and review Clubs."
            : "Nutzen Sie menübasierte Abläufe, um umfangreiche Nachrichten und Veranstaltungen zu erstellen und Clubs zu prüfen."}
        </p>
      </header>

      <nav className={styles.menuTabs}>
        {permissions.canManageNews ? (
          <button
            type="button"
            className={`${styles.tabButton} ${activeMenu === "news" ? styles.tabActive : ""}`}
            onClick={() => setActiveMenu("news")}
          >
            {locale === "en" ? "Create News" : "Nachrichten erstellen"}
          </button>
        ) : null}
        {permissions.canManageEvents ? (
          <button
            type="button"
            className={`${styles.tabButton} ${activeMenu === "events" ? styles.tabActive : ""}`}
            onClick={() => setActiveMenu("events")}
          >
            {locale === "en" ? "Create Event" : "Veranstaltung erstellen"}
          </button>
        ) : null}
        {permissions.canApproveClubIdea ? (
          <button
            type="button"
            className={`${styles.tabButton} ${activeMenu === "clubs" ? styles.tabActive : ""}`}
            onClick={() => setActiveMenu("clubs")}
          >
            {locale === "en" ? "Review Clubs" : "Clubs prüfen"}
            {clubs.length > 0 ? (
              <span className={styles.tabBadge}>{clubs.length}</span>
            ) : null}
          </button>
        ) : null}
      </nav>

      {warnings.length > 0 ? (
        <div className={styles.warningBox}>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {activeMenu === "news" && permissions.canManageNews ? (
        <section className={styles.panel}>
          <div className={styles.editorColumn}>
            <h2>{locale === "en" ? "Create News (Rich Text)" : "Nachrichten erstellen (Rich Text)"}</h2>
            <div className={styles.grid2}>
              <input
                placeholder={t(locale, "title")}
                value={newsInput.title}
                onChange={(event) => setNewsInput((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <input
                placeholder={locale === "en" ? "Course label (optional)" : "Kursbezeichnung (optional)"}
                value={newsInput.courseLabel}
                onChange={(event) => setNewsInput((current) => ({ ...current, courseLabel: event.target.value }))}
              />
            </div>
            <input
              placeholder={locale === "en" ? "Short description (preview)" : "Kurzbeschreibung (Vorschau)"}
              value={newsInput.excerpt}
              onChange={(event) => setNewsInput((current) => ({ ...current, excerpt: event.target.value }))}
              required
            />
            <input
              type="url"
              placeholder={locale === "en" ? "Image URL" : "Bild-URL"}
              value={newsInput.featuredImageUrl}
              onChange={(event) => setNewsInput((current) => ({ ...current, featuredImageUrl: event.target.value }))}
            />

            <div className={styles.grid2}>
              <select
                value={newsInput.visibility}
                onChange={(event) =>
                  setNewsInput((current) => ({
                    ...current,
                    visibility: event.target.value as "all" | "student" | "professor",
                  }))
                }
              >
                <option value="all">{locale === "en" ? "All users" : "Alle Nutzer"}</option>
                <option value="student">{locale === "en" ? "Students only" : "Nur Studierende"}</option>
                <option value="professor">{locale === "en" ? "Professors only" : "Nur Professoren"}</option>
              </select>
              <select
                value={newsInput.category}
                onChange={(event) => setNewsInput((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">{locale === "en" ? "Category" : "Kategorie"}</option>
                {categories.map((category) => (
                  <option key={category.documentId ?? category.id} value={category.documentId ?? String(category.id ?? "")}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <label className={styles.label}>{locale === "en" ? "Category tags" : "Kategorie-Tags"}</label>
            <div className={styles.tagOptions}>
              {tags.map((tag) => {
                const tagId = tag.documentId ?? String(tag.id ?? "");
                if (!tagId) return null;
                const checked = newsInput.tagIds.includes(tagId);
                return (
                  <label key={tagId} className={styles.tagOption}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setNewsInput((current) => ({
                          ...current,
                          tagIds: event.target.checked
                            ? [...current.tagIds, tagId]
                            : current.tagIds.filter((id) => id !== tagId),
                        }))
                      }
                    />
                    <span>{tag.name}</span>
                  </label>
                );
              })}
            </div>

            <div className={styles.toolbar}>
              <button type="button" onClick={() => applyRichText("news", "**", "**", "bold")}>B</button>
              <button type="button" onClick={() => applyRichText("news", "_", "_", "italic")}>I</button>
              <button type="button" onClick={() => applyRichText("news", "## ", "", "Heading")}>H2</button>
              <button type="button" onClick={() => applyRichText("news", "- ", "", "List item")}>• List</button>
              <button type="button" onClick={() => applyRichText("news", "[", "](https://)", "Link text")}>Link</button>
              <button type="button" onClick={() => applyRichText("news", "![Alt text](", ")", "https://image-url")}>Image</button>
            </div>

            <textarea
              ref={newsEditorRef}
              placeholder={locale === "en" ? "Long description / rich text content" : "Lange Beschreibung / Rich-Text-Inhalt"}
              value={newsInput.content}
              onChange={(event) => setNewsInput((current) => ({ ...current, content: event.target.value }))}
              rows={12}
              required
            />

            <div className={styles.metaPanel}>
              <p><strong>{locale === "en" ? "Author" : "Autor"}:</strong> {auth.profile?.firstName} {auth.profile?.lastName} ({auth.profile?.email ?? auth.user.email})</p>
              <p><strong>{locale === "en" ? "Created" : "Erstellt"}:</strong> {formatTime(locale, newsMeta.createdAt)}</p>
              <p><strong>{locale === "en" ? "Edited" : "Bearbeitet"}:</strong> {formatTime(locale, newsMeta.updatedAt)}</p>
              <p><strong>{locale === "en" ? "Saved" : "Gespeichert"}:</strong> {formatTime(locale, newsMeta.savedAt)}</p>
              <p><strong>{locale === "en" ? "Published" : "Veröffentlicht"}:</strong> {formatTime(locale, newsMeta.publishedAt)}</p>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryAction} onClick={() => void saveNewsDraft()} disabled={savingNews}>
                {savingNews ? t(locale, "loading") : locale === "en" ? "Save Draft" : "Entwurf speichern"}
              </button>
              <button type="button" className={styles.primaryAction} onClick={() => void publishNews()} disabled={savingNews}>
                {savingNews ? t(locale, "loading") : locale === "en" ? "Publish News" : "Nachricht veröffentlichen"}
              </button>
            </div>
          </div>
          <aside className={styles.previewColumn}>
            <h3>{locale === "en" ? "Preview" : "Vorschau"}</h3>
            <div className={styles.preview}>
              <h4>{newsInput.title || (locale === "en" ? "News title" : "Nachrichtentitel")}</h4>
              <p>{newsInput.excerpt || (locale === "en" ? "Short description preview." : "Kurzbeschreibung-Vorschau.")}</p>
              <ReactMarkdown>{newsInput.content || ""}</ReactMarkdown>
            </div>
          </aside>
        </section>
      ) : null}

      {activeMenu === "events" && permissions.canManageEvents ? (
        <section className={styles.panel}>
          <div className={styles.editorColumn}>
            <h2>{locale === "en" ? "Create Event (Rich Text)" : "Veranstaltung erstellen (Rich Text)"}</h2>
            <div className={styles.grid2}>
              <input
                placeholder={t(locale, "title")}
                value={eventInput.title}
                onChange={(event) => setEventInput((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <input
                placeholder={locale === "en" ? "Short description (preview)" : "Kurzbeschreibung (Vorschau)"}
                value={eventInput.shortDescription}
                onChange={(event) => setEventInput((current) => ({ ...current, shortDescription: event.target.value }))}
              />
            </div>
            <div className={styles.grid2}>
              <input
                placeholder={t(locale, "location")}
                value={eventInput.location}
                onChange={(event) => setEventInput((current) => ({ ...current, location: event.target.value }))}
                required
              />
              <input
                type="url"
                placeholder={locale === "en" ? "Image URL" : "Bild-URL"}
                value={eventInput.thumbnailUrl}
                onChange={(event) => setEventInput((current) => ({ ...current, thumbnailUrl: event.target.value }))}
              />
            </div>
            <div className={styles.grid2}>
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
            </div>
            <div className={styles.grid2}>
              <select
                value={eventInput.category}
                onChange={(event) => setEventInput((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">{locale === "en" ? "Category" : "Kategorie"}</option>
                {categories.map((category) => (
                  <option key={category.documentId ?? category.id} value={category.documentId ?? String(category.id ?? "")}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className={styles.helperText}>
                {locale === "en" ? "Tags can be applied below." : "Tags können unten hinzugefügt werden."}
              </span>
            </div>

            <label className={styles.label}>{locale === "en" ? "Category tags" : "Kategorie-Tags"}</label>
            <div className={styles.tagOptions}>
              {tags.map((tag) => {
                const tagId = tag.documentId ?? String(tag.id ?? "");
                if (!tagId) return null;
                const checked = eventInput.tagIds.includes(tagId);
                return (
                  <label key={tagId} className={styles.tagOption}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setEventInput((current) => ({
                          ...current,
                          tagIds: event.target.checked
                            ? [...current.tagIds, tagId]
                            : current.tagIds.filter((id) => id !== tagId),
                        }))
                      }
                    />
                    <span>{tag.name}</span>
                  </label>
                );
              })}
            </div>

            <div className={styles.toolbar}>
              <button type="button" onClick={() => applyRichText("event", "**", "**", "bold")}>B</button>
              <button type="button" onClick={() => applyRichText("event", "_", "_", "italic")}>I</button>
              <button type="button" onClick={() => applyRichText("event", "## ", "", "Heading")}>H2</button>
              <button type="button" onClick={() => applyRichText("event", "- ", "", "List item")}>• List</button>
              <button type="button" onClick={() => applyRichText("event", "[", "](https://)", "Link text")}>Link</button>
              <button type="button" onClick={() => applyRichText("event", "![Alt text](", ")", "https://image-url")}>Image</button>
            </div>

            <textarea
              ref={eventEditorRef}
              placeholder={locale === "en" ? "Long description / event details" : "Lange Beschreibung / Event-Details"}
              value={eventInput.description}
              onChange={(event) => setEventInput((current) => ({ ...current, description: event.target.value }))}
              rows={12}
              required
            />

            <div className={styles.metaPanel}>
              <p><strong>{locale === "en" ? "Author" : "Autor"}:</strong> {auth.profile?.firstName} {auth.profile?.lastName} ({auth.profile?.email ?? auth.user.email})</p>
              <p><strong>{locale === "en" ? "Created" : "Erstellt"}:</strong> {formatTime(locale, eventMeta.createdAt)}</p>
              <p><strong>{locale === "en" ? "Edited" : "Bearbeitet"}:</strong> {formatTime(locale, eventMeta.updatedAt)}</p>
              <p><strong>{locale === "en" ? "Saved" : "Gespeichert"}:</strong> {formatTime(locale, eventMeta.savedAt)}</p>
              <p><strong>{locale === "en" ? "Published" : "Veröffentlicht"}:</strong> {formatTime(locale, eventMeta.publishedAt)}</p>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryAction} onClick={() => void saveEventDraft()} disabled={savingEvent}>
                {savingEvent ? t(locale, "loading") : locale === "en" ? "Save Draft" : "Entwurf speichern"}
              </button>
              <button type="button" className={styles.primaryAction} onClick={() => void publishEvent()} disabled={savingEvent}>
                {savingEvent ? t(locale, "loading") : locale === "en" ? "Publish Event" : "Veranstaltung veröffentlichen"}
              </button>
            </div>
          </div>

          <aside className={styles.previewColumn}>
            <h3>{locale === "en" ? "Preview" : "Vorschau"}</h3>
            <div className={styles.preview}>
              <h4>{eventInput.title || (locale === "en" ? "Event title" : "Veranstaltungstitel")}</h4>
              <p>{eventInput.shortDescription || (locale === "en" ? "Short description preview." : "Kurzbeschreibung-Vorschau.")}</p>
              <ReactMarkdown>{eventInput.description || ""}</ReactMarkdown>
            </div>
          </aside>
        </section>
      ) : null}

      {activeMenu === "clubs" && permissions.canApproveClubIdea ? (
        <section className={`${styles.panel} ${styles.singlePanel}`}>
          <div className={styles.clubListColumn}>
            <h2>
              {locale === "en" ? "Pending Club Requests" : "Ausstehende Club-Anfragen"}
              {clubs.length > 0 ? <span className={styles.headingBadge}>{clubs.length}</span> : null}
            </h2>
            {clubs.length === 0 ? (
              <p className={styles.emptyState}>
                {locale === "en" ? "No clubs pending review." : "Keine Clubs zur Prüfung vorhanden."}
              </p>
            ) : (
              clubs.map((club) => {
                const submitter = club.submittedBy
                  ? `${club.submittedBy.firstName ?? ""} ${club.submittedBy.lastName ?? ""}`.trim()
                  : null;
                return (
                  <article key={club.documentId ?? club.id} className={styles.clubListItem}>
                    <div className={styles.clubListInfo}>
                      <strong>{club.title}</strong>
                      <p>{club.shortDescription}</p>
                      {submitter ? (
                        <small>
                          {locale === "en" ? "Submitted by" : "Eingereicht von"}: {submitter}
                          {club.submittedBy?.email ? ` · ${club.submittedBy.email}` : ""}
                        </small>
                      ) : null}
                    </div>
                    <Link
                      className={styles.reviewLink}
                      href={`/manage/clubs/${club.slug ?? club.documentId ?? club.id ?? ""}`}
                    >
                      {locale === "en" ? "Review →" : "Prüfen →"}
                    </Link>
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
