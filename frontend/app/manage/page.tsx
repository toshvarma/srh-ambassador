"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import {
  createStrapiEntry,
  fetchStrapiCollection,
  strapiMediaUrl,
  updateStrapiEntry,
  type StrapiEntry,
} from "@/lib/strapi";
import styles from "./manage.module.css";

type NewsTag = { documentId?: string; name?: string; title?: string; parentId?: string; parentTitle?: string; path?: string };
type NewsAudience = "all" | "student" | "professor";

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

type SaveMode = "draft" | "published";

const JOOMLA_API_URL = process.env.NEXT_PUBLIC_JOOMLA_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://joomla.test";
const ACCEPTED_IMAGE_EXTS = ".png,.jpg,.jpeg,.webp,.gif";
const LONG_TEXT_LIMIT = 2500;
const COURSE_TAG_NAMES = ["B.Sc Web Development", "B.A UX / UI Design", "B.A Photography"] as const;
const COURSE_PARENT_NAMES = ["courses", "course tags", "course"];
const EVENT_CATEGORY_PARENT_NAMES = ["event categories", "event category", "categories", "category tags"];
const ALL_COURSES_VALUE = "__all_courses__";
const NO_CATEGORY_VALUE = "__no_category__";

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

function isRootTag(tag: NewsTag) {
  const label = (tag.name ?? tag.title ?? "").trim().toLowerCase();
  return label === "root";
}

function tagLabel(tag: NewsTag) {
  return tag.name ?? tag.title ?? "";
}

function normalizeTagName(value: string) {
  return value.trim().toLowerCase();
}

function normalizeParentName(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeVisibilityFilters(values: NewsAudience[]) {
  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length === 0) return ["all"] as NewsAudience[];
  if (uniqueValues.includes("all") && uniqueValues.length > 1) {
    return uniqueValues.filter((value) => value !== "all") as NewsAudience[];
  }
  return uniqueValues;
}

function resolveVisibilityValue(values: NewsAudience[]): NewsAudience {
  const selected = normalizeVisibilityFilters(values);
  if (selected.includes("all")) return "all";
  if (selected.includes("student") && selected.includes("professor")) return "all";
  if (selected.includes("student")) return "student";
  if (selected.includes("professor")) return "professor";
  return "all";
}

function normalizeCourseFilters(values: string[]) {
  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length === 0) return [ALL_COURSES_VALUE];
  if (uniqueValues.includes(ALL_COURSES_VALUE) && uniqueValues.length > 1) {
    return uniqueValues.filter((value) => value !== ALL_COURSES_VALUE);
  }
  return uniqueValues;
}

function normalizeCategoryFilters(values: string[]) {
  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length === 0) return [NO_CATEGORY_VALUE];
  if (uniqueValues.includes(NO_CATEGORY_VALUE) && uniqueValues.length > 1) {
    return uniqueValues.filter((value) => value !== NO_CATEGORY_VALUE);
  }
  return uniqueValues;
}

async function uploadImageFile(file: File, token: string): Promise<string> {
  const body = new FormData();
  body.append("files", file, file.name);
  const res = await fetch(`${JOOMLA_API_URL}/srh-api/index.php/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err?.error ?? `Upload failed (${res.status})`);
  }
  const data = await res.json() as { data: Array<{ url?: string }> };
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("No URL returned from upload.");
  return url.startsWith("http") ? url : `${JOOMLA_API_URL}${url}`;
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
  const [tags, setTags] = useState<Array<StrapiEntry<NewsTag>>>([]);
  const [clubs, setClubs] = useState<Array<StrapiEntry<ClubItem>>>([]);

  const [newsInput, setNewsInput] = useState({
    title: "",
    excerpt: "",
    content: "",
    featuredImageUrl: "",
    visibilityFilters: ["all"] as NewsAudience[],
    categoryTagIds: [NO_CATEGORY_VALUE] as string[],
    courseTagIds: [ALL_COURSES_VALUE] as string[],
  });
  const [eventInput, setEventInput] = useState({
    title: "",
    shortDescription: "",
    description: "",
    location: "",
    start_datetime: "",
    end_datetime: "",
    thumbnailUrl: "",
    categoryTagId: NO_CATEGORY_VALUE,
    courseTagId: ALL_COURSES_VALUE,
  });

  const [newsDraftId, setNewsDraftId] = useState<string | null>(null);
  const [eventDraftId, setEventDraftId] = useState<string | null>(null);
  const [newsMeta, setNewsMeta] = useState<SavedMeta>({});
  const [eventMeta, setEventMeta] = useState<SavedMeta>({});
  const [savingNews, setSavingNews] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState<string>("");
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string>("");
  const [newsConfirmation, setNewsConfirmation] = useState<{ mode: SaveMode; title: string } | null>(null);
  const [eventConfirmation, setEventConfirmation] = useState<{ mode: SaveMode; title: string } | null>(null);

  const newsEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const eventEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const newsImageInputRef = useRef<HTMLInputElement | null>(null);
  const eventImageInputRef = useRef<HTMLInputElement | null>(null);

  const canAccessManage = useMemo(
    () =>
      permissions.canManageEvents || permissions.canManageNews || permissions.canApproveClubIdea,
    [permissions]
  );

  const visibleTags = useMemo(
    () => tags.filter((tag) => !isRootTag(tag)),
    [tags]
  );

  const courseTags = useMemo(
    () => visibleTags.filter((tag) => COURSE_PARENT_NAMES.includes(normalizeParentName(tag.parentTitle))),
    [visibleTags]
  );

  const categoryTags = useMemo(
    () => visibleTags.filter((tag) => EVENT_CATEGORY_PARENT_NAMES.includes(normalizeParentName(tag.parentTitle))),
    [visibleTags]
  );

  const missingCourseTags = useMemo(
    () => COURSE_TAG_NAMES.filter((courseName) => !courseTags.some((tag) => normalizeTagName(tagLabel(tag)) === normalizeTagName(courseName))),
    [courseTags]
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

  useEffect(() => {
    if (eventInput.courseTagId && eventInput.courseTagId !== ALL_COURSES_VALUE) return;
    const isLarsAmbassador = (auth?.profile?.email ?? auth?.user?.email ?? "").toLowerCase() === "ambassador.lars@srh.de";
    if (!isLarsAmbassador) return;
    const defaultCourse = courseTags.find((tag) => normalizeTagName(tagLabel(tag)) === normalizeTagName("B.Sc Web Development"));
    if (!defaultCourse) return;
    const tagId = defaultCourse.documentId ?? String(defaultCourse.id ?? "");
    if (!tagId) return;
    setEventInput((current) => ({ ...current, courseTagId: tagId }));
  }, [auth?.profile?.email, auth?.user?.email, courseTags, eventInput.courseTagId]);

  const loadManageData = useCallback(async () => {
    if (!auth?.token) return;

    setError(null);
    const nextWarnings: string[] = [];

    if (permissions.canManageNews || permissions.canManageEvents) {
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

  function handleEventImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(locale === "en"
        ? "Only image files are accepted (PNG, JPG, WEBP, GIF)."
        : "Nur Bilddateien sind erlaubt (PNG, JPG, WEBP, GIF).");
      return;
    }
    setEventImageFile(file);
    setEventImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function handleNewsImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(locale === "en"
        ? "Only image files are accepted (PNG, JPG, WEBP, GIF)."
        : "Nur Bilddateien sind erlaubt (PNG, JPG, WEBP, GIF).");
      return;
    }
    setNewsImageFile(file);
    setNewsImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  async function buildEventPayload(publishedAt: string | null) {
    const authorName = auth?.profile
      ? `${auth.profile.firstName ?? ""} ${auth.profile.lastName ?? ""}`.trim() || auth.user.email
      : auth?.user.email;
    let thumbnailUrl = eventInput.thumbnailUrl || null;
    if (eventImageFile && auth?.token) {
      thumbnailUrl = await uploadImageFile(eventImageFile, auth.token);
    }
    const categoryTagId = eventInput.categoryTagId === NO_CATEGORY_VALUE ? "" : eventInput.categoryTagId;
    const courseTagId = eventInput.courseTagId === ALL_COURSES_VALUE ? "" : eventInput.courseTagId;
    const selectedTags = [categoryTagId, courseTagId].filter((value, index, values) => {
      return Boolean(value) && values.indexOf(value) === index;
    });
    return {
      title: eventInput.title,
      shortDescription: eventInput.shortDescription,
      description: eventInput.description,
      location: eventInput.location,
      start_datetime: eventInput.start_datetime || null,
      end_datetime: eventInput.end_datetime || null,
      startDate: eventInput.start_datetime || null,
      endDate: eventInput.end_datetime || null,
      start_date: eventInput.start_datetime || null,
      end_date: eventInput.end_datetime || null,
      thumbnailUrl,
      thumbnail_url: thumbnailUrl,
      category: null,
      tags: selectedTags,
      authorName,
      author: auth?.profile?.documentId ?? null,
      publishedAt,
    };
  }

  async function saveNewsDraft() {
    if (!permissions.canManageNews || !auth?.token) return;
    if (newsInput.content.length > LONG_TEXT_LIMIT) {
      setError(locale === "en"
        ? `Long description must be ${LONG_TEXT_LIMIT} characters or fewer.`
        : `Die lange Beschreibung darf höchstens ${LONG_TEXT_LIMIT} Zeichen enthalten.`);
      return;
    }
    try {
      setSavingNews(true);
      setError(null);
      const selectedTags = Array.from(new Set([...newsInput.courseTagIds, ...newsInput.categoryTagIds]))
        .filter((tagId) => tagId !== ALL_COURSES_VALUE && tagId !== NO_CATEGORY_VALUE);
      let featuredImageUrl = newsInput.featuredImageUrl || null;
      if (newsImageFile && auth?.token) {
        featuredImageUrl = await uploadImageFile(newsImageFile, auth.token);
      }
      const payload = {
        title: newsInput.title,
        excerpt: newsInput.excerpt,
        content: newsInput.content,
        featured_image: featuredImageUrl,
        visibility: resolveVisibilityValue(newsInput.visibilityFilters),
        category: null,
        tags: selectedTags,
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
      setNewsInput((current) => ({ ...current, featuredImageUrl: featuredImageUrl ?? "" }));
      setNewsImageFile(null);
      setNewsImagePreview("");
      setNewsConfirmation({ mode: "draft", title: newsInput.title.trim() || (locale === "en" ? "News item" : "Nachricht") });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingNews(false);
    }
  }

  async function publishNews() {
    if (!permissions.canManageNews || !auth?.token) return;
    if (newsInput.content.length > LONG_TEXT_LIMIT) {
      setError(locale === "en"
        ? `Long description must be ${LONG_TEXT_LIMIT} characters or fewer.`
        : `Die lange Beschreibung darf höchstens ${LONG_TEXT_LIMIT} Zeichen enthalten.`);
      return;
    }
    try {
      setSavingNews(true);
      setError(null);
      const selectedTags = Array.from(new Set([...newsInput.courseTagIds, ...newsInput.categoryTagIds]))
        .filter((tagId) => tagId !== ALL_COURSES_VALUE && tagId !== NO_CATEGORY_VALUE);
      let featuredImageUrl = newsInput.featuredImageUrl || null;
      if (newsImageFile && auth?.token) {
        featuredImageUrl = await uploadImageFile(newsImageFile, auth.token);
      }
      const payload = {
        title: newsInput.title,
        excerpt: newsInput.excerpt,
        content: newsInput.content,
        featured_image: featuredImageUrl,
        visibility: resolveVisibilityValue(newsInput.visibilityFilters),
        category: null,
        tags: selectedTags,
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
      setNewsInput((current) => ({ ...current, featuredImageUrl: featuredImageUrl ?? "" }));
      setNewsImageFile(null);
      setNewsImagePreview("");
      setNewsConfirmation({ mode: "published", title: newsInput.title.trim() || (locale === "en" ? "News item" : "Nachricht") });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingNews(false);
    }
  }

  async function saveEventDraft() {
    if (!permissions.canManageEvents || !auth?.token) return;
    if (eventInput.description.length > LONG_TEXT_LIMIT) {
      setError(locale === "en"
        ? `Long description must be ${LONG_TEXT_LIMIT} characters or fewer.`
        : `Die lange Beschreibung darf höchstens ${LONG_TEXT_LIMIT} Zeichen enthalten.`);
      return;
    }
    try {
      setSavingEvent(true);
      setError(null);
      const payload = await buildEventPayload(null);
      const saved = eventDraftId
        ? await updateStrapiEntry(`/events/${eventDraftId}`, payload, { token: auth.token, locale })
        : await createStrapiEntry("/events", payload, { token: auth.token, locale });
      if (saved?.documentId) {
        setEventDraftId(saved.documentId);
      }
      setEventMeta({ ...readMeta(saved), savedAt: new Date().toISOString() });
      setEventInput((current) => ({ ...current, thumbnailUrl: payload.thumbnailUrl ?? "" }));
      setEventImageFile(null);
      setEventConfirmation({ mode: "draft", title: eventInput.title.trim() || (locale === "en" ? "Event" : "Veranstaltung") });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSavingEvent(false);
    }
  }

  async function publishEvent() {
    if (!permissions.canManageEvents || !auth?.token) return;
    if (eventInput.description.length > LONG_TEXT_LIMIT) {
      setError(locale === "en"
        ? `Long description must be ${LONG_TEXT_LIMIT} characters or fewer.`
        : `Die lange Beschreibung darf höchstens ${LONG_TEXT_LIMIT} Zeichen enthalten.`);
      return;
    }
    try {
      setSavingEvent(true);
      setError(null);
      const payload = await buildEventPayload(new Date().toISOString());
      const saved = eventDraftId
        ? await updateStrapiEntry(`/events/${eventDraftId}`, payload, { token: auth.token, locale })
        : await createStrapiEntry("/events", payload, { token: auth.token, locale });
      if (saved?.documentId) {
        setEventDraftId(saved.documentId);
      }
      setEventMeta({ ...readMeta(saved), savedAt: new Date().toISOString() });
      setEventInput((current) => ({ ...current, thumbnailUrl: payload.thumbnailUrl ?? "" }));
      setEventImageFile(null);
      setEventConfirmation({ mode: "published", title: eventInput.title.trim() || (locale === "en" ? "Event" : "Veranstaltung") });
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
            <h2>{locale === "en" ? "Create News" : "Nachrichten erstellen"}</h2>
            <input
              placeholder={t(locale, "title")}
              value={newsInput.title}
              onChange={(event) => setNewsInput((current) => ({ ...current, title: event.target.value }))}
              required
            />
            <input
              placeholder={locale === "en" ? "Short description (preview)" : "Kurzbeschreibung (Vorschau)"}
              value={newsInput.excerpt}
              onChange={(event) => setNewsInput((current) => ({ ...current, excerpt: event.target.value }))}
              required
            />
            <label className={styles.formFieldLabel}>
              <span>{locale === "en" ? "Image upload" : "Bild-Upload"}</span>
              {newsImagePreview || newsInput.featuredImageUrl ? (
                <div className={styles.imagePreviewWrap}>
                  <img
                    src={strapiMediaUrl(newsImagePreview || newsInput.featuredImageUrl) || newsImagePreview || newsInput.featuredImageUrl}
                    alt={locale === "en" ? "News preview" : "Nachrichten-Vorschau"}
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    className={styles.imageRemove}
                    onClick={() => {
                      setNewsImageFile(null);
                      setNewsImagePreview("");
                      setNewsInput((current) => ({ ...current, featuredImageUrl: "" }));
                      if (newsImageInputRef.current) newsImageInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className={styles.imageDropzone}>
                  <span>{locale === "en" ? "Click to upload image" : "Klicken zum Hochladen"}</span>
                  <span className={styles.imageDropzoneHint}>PNG, JPG, WEBP, GIF</span>
                  <input
                    ref={newsImageInputRef}
                    className={styles.fileInputHidden}
                    type="file"
                    accept={ACCEPTED_IMAGE_EXTS}
                    onChange={handleNewsImageChange}
                  />
                </div>
              )}
            </label>

            <div className={styles.grid3}>
              <label className={styles.formFieldLabel}>
                <span>{locale === "en" ? "Users" : "Nutzer"}</span>
                <select
                  className={styles.multiSelect}
                  multiple
                  value={newsInput.visibilityFilters}
                  onChange={(event) => {
                    const selectedValues = Array.from(event.target.selectedOptions).map((option) => option.value as NewsAudience);
                    setNewsInput((current) => ({ ...current, visibilityFilters: normalizeVisibilityFilters(selectedValues) }));
                  }}
                  size={6}
                >
                  <option value="all">{locale === "en" ? "All users" : "Alle Nutzer"}</option>
                  <option value="student">{locale === "en" ? "Students only" : "Nur Studierende"}</option>
                  <option value="professor">{locale === "en" ? "Professors only" : "Nur Professoren"}</option>
                </select>
              </label>
              <label className={styles.formFieldLabel}>
                <span>{locale === "en" ? "Course" : "Kurs"}</span>
                <select
                  className={styles.multiSelect}
                  multiple
                  value={newsInput.courseTagIds}
                  onChange={(event) => {
                    const selectedIds = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setNewsInput((current) => ({ ...current, courseTagIds: normalizeCourseFilters(selectedIds) }));
                  }}
                  size={6}
                >
                  <option value={ALL_COURSES_VALUE}>{locale === "en" ? "All courses" : "Alle Kurse"}</option>
                  {courseTags.map((tag) => {
                    const tagId = tag.documentId ?? String(tag.id ?? "");
                    if (!tagId) return null;
                    return (
                      <option key={tagId} value={tagId}>
                        {tagLabel(tag)}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className={styles.formFieldLabel}>
                <span>{locale === "en" ? "Category" : "Kategorie"}</span>
                <select
                  className={styles.multiSelect}
                  multiple
                  value={newsInput.categoryTagIds}
                  onChange={(event) => {
                    const selectedIds = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setNewsInput((current) => ({ ...current, categoryTagIds: normalizeCategoryFilters(selectedIds) }));
                  }}
                  size={6}
                >
                  <option value={NO_CATEGORY_VALUE}>{locale === "en" ? "No Category" : "Keine Kategorie"}</option>
                  {categoryTags.map((tag) => {
                    const tagId = tag.documentId ?? String(tag.id ?? "");
                    if (!tagId) return null;
                    return (
                      <option key={tagId} value={tagId}>
                        {tagLabel(tag)}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <p className={styles.helperText}>
              {locale === "en"
                ? "Hold Ctrl/Cmd to select multiple values in each dropdown."
                : "Für Mehrfachauswahl in jedem Dropdown Strg/Cmd gedrückt halten."}
            </p>

            <div className={styles.richEditor}>
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
                className={styles.richTextArea}
                placeholder={locale === "en" ? "Long description / rich text content" : "Lange Beschreibung / Rich-Text-Inhalt"}
                value={newsInput.content}
                onChange={(event) => setNewsInput((current) => ({ ...current, content: event.target.value.slice(0, LONG_TEXT_LIMIT) }))}
                rows={12}
                maxLength={LONG_TEXT_LIMIT}
                required
              />
            </div>
            <p className={styles.charCounter}>
              {newsInput.content.length}/{LONG_TEXT_LIMIT}
            </p>

            <div className={styles.metaPanel}>
              <p><strong>{locale === "en" ? "Author" : "Autor"}:</strong> {auth.profile?.firstName} {auth.profile?.lastName} ({auth.profile?.email ?? auth.user.email})</p>
              <p><strong>{locale === "en" ? "Created" : "Erstellt"}:</strong> {formatTime(locale, newsMeta.createdAt)}</p>
              <p><strong>{locale === "en" ? "Edited" : "Bearbeitet"}:</strong> {formatTime(locale, newsMeta.updatedAt)}</p>
              <p><strong>{locale === "en" ? "Saved" : "Gespeichert"}:</strong> {formatTime(locale, newsMeta.savedAt)}</p>
              <p><strong>{locale === "en" ? "Published" : "Veröffentlicht"}:</strong> {formatTime(locale, newsMeta.publishedAt)}</p>
            </div>

            {newsConfirmation ? (
              <div className={styles.confirmationCard}>
                <h4>{newsConfirmation.mode === "published"
                  ? (locale === "en" ? "News published" : "Nachricht veröffentlicht")
                  : (locale === "en" ? "Draft saved" : "Entwurf gespeichert")}</h4>
                <p>
                  {locale === "en" ? "Saved successfully:" : "Erfolgreich gespeichert:"} {newsConfirmation.title}
                </p>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setNewsConfirmation(null)}
                >
                  {locale === "en" ? "Continue editing" : "Weiter bearbeiten"}
                </button>
              </div>
            ) : (
              <div className={styles.actions}>
                <button type="button" className={styles.secondaryAction} onClick={() => void saveNewsDraft()} disabled={savingNews}>
                  {savingNews ? t(locale, "loading") : locale === "en" ? "Save Draft" : "Entwurf speichern"}
                </button>
                <button type="button" className={styles.primaryAction} onClick={() => void publishNews()} disabled={savingNews}>
                  {savingNews ? t(locale, "loading") : locale === "en" ? "Publish News" : "Nachricht veröffentlichen"}
                </button>
              </div>
            )}
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
            <h2>{locale === "en" ? "Create Event" : "Veranstaltung erstellen"}</h2>
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
            <input
              placeholder={t(locale, "location")}
              value={eventInput.location}
              onChange={(event) => setEventInput((current) => ({ ...current, location: event.target.value }))}
              required
            />
            <label className={styles.formFieldLabel}>
              <span>{locale === "en" ? "Event image" : "Event-Bild"}</span>
              {eventImagePreview || eventInput.thumbnailUrl ? (
                <div className={styles.imagePreviewWrap}>
                  <img
                    src={strapiMediaUrl(eventImagePreview || eventInput.thumbnailUrl) || eventImagePreview || eventInput.thumbnailUrl}
                    alt={locale === "en" ? "Event preview" : "Event-Vorschau"}
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    className={styles.imageRemove}
                    onClick={() => {
                      setEventImageFile(null);
                      setEventImagePreview("");
                      setEventInput((current) => ({ ...current, thumbnailUrl: "" }));
                      if (eventImageInputRef.current) eventImageInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className={styles.imageDropzone}>
                  <span>{locale === "en" ? "Click to upload image" : "Klicken zum Hochladen"}</span>
                  <span className={styles.imageDropzoneHint}>PNG, JPG, WEBP, GIF</span>
                  <input
                    ref={eventImageInputRef}
                    className={styles.fileInputHidden}
                    type="file"
                    accept={ACCEPTED_IMAGE_EXTS}
                    onChange={handleEventImageChange}
                  />
                </div>
              )}
            </label>
            <label className={styles.formFieldLabel}>
              <span>{locale === "en" ? "Start time" : "Startzeit"}</span>
              <input
                type="datetime-local"
                value={eventInput.start_datetime}
                onChange={(event) => setEventInput((current) => ({ ...current, start_datetime: event.target.value }))}
                required
              />
            </label>
            <label className={styles.formFieldLabel}>
              <span>{locale === "en" ? "End time" : "Endzeit"}</span>
              <input
                type="datetime-local"
                value={eventInput.end_datetime}
                onChange={(event) => setEventInput((current) => ({ ...current, end_datetime: event.target.value }))}
                required
              />
            </label>
            <label className={styles.formFieldLabel}>
              <span>{locale === "en" ? "Category" : "Kategorie"}</span>
              <select
                className={styles.multiSelect}
                value={eventInput.categoryTagId}
                onChange={(event) => setEventInput((current) => ({ ...current, categoryTagId: event.target.value }))}
              >
                <option value={NO_CATEGORY_VALUE}>{locale === "en" ? "No Category" : "Keine Kategorie"}</option>
                {categoryTags.map((tag) => {
                  const tagId = tag.documentId ?? String(tag.id ?? "");
                  if (!tagId) return null;
                  return (
                    <option key={tagId} value={tagId}>
                      {tagLabel(tag)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className={styles.formFieldLabel}>
              <span>{locale === "en" ? "Course tags" : "Kurs-Tags"}</span>
              <select
                className={styles.multiSelect}
                value={eventInput.courseTagId}
                onChange={(event) => setEventInput((current) => ({ ...current, courseTagId: event.target.value }))}
              >
                <option value={ALL_COURSES_VALUE}>{locale === "en" ? "All courses" : "Alle Kurse"}</option>
                {courseTags.map((tag) => {
                  const tagId = tag.documentId ?? String(tag.id ?? "");
                  if (!tagId) return null;
                  return (
                    <option key={tagId} value={tagId}>
                      {tagLabel(tag)}
                    </option>
                  );
                })}
              </select>
            </label>

            {categoryTags.length === 0 ? (
              <p className={styles.inlineWarning}>
                {locale === "en"
                  ? "No event category tags found. Create tags under parent tag 'Event Categories'."
                  : "Keine Event-Kategorie-Tags gefunden. Erstellen Sie Tags unter dem Parent-Tag 'Event Categories'."}
              </p>
            ) : null}
            {missingCourseTags.length > 0 ? (
              <p className={styles.inlineWarning}>
                {locale === "en"
                  ? `Missing Joomla course tags under parent 'Courses': ${missingCourseTags.join(", ")}`
                  : `Fehlende Joomla-Kurs-Tags unter Parent 'Courses': ${missingCourseTags.join(", ")}`}
              </p>
            ) : null}
            <div className={styles.selectedTagRow}>
              {eventInput.categoryTagId && eventInput.categoryTagId !== NO_CATEGORY_VALUE ? (
                <span className={styles.selectedTagChip}>
                  {locale === "en" ? "Category" : "Kategorie"}:{" "}
                  {categoryTags.find((tag) => (tag.documentId ?? String(tag.id ?? "")) === eventInput.categoryTagId)?.name
                    ?? categoryTags.find((tag) => (tag.documentId ?? String(tag.id ?? "")) === eventInput.categoryTagId)?.title
                    ?? "-"}
                </span>
              ) : null}
            </div>

            <div className={styles.richEditor}>
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
                className={styles.richTextArea}
                placeholder={locale === "en" ? "Long description / event details" : "Lange Beschreibung / Event-Details"}
                value={eventInput.description}
                onChange={(event) => setEventInput((current) => ({ ...current, description: event.target.value.slice(0, LONG_TEXT_LIMIT) }))}
                rows={12}
                maxLength={LONG_TEXT_LIMIT}
                required
              />
            </div>
            <p className={styles.charCounter}>
              {eventInput.description.length}/{LONG_TEXT_LIMIT}
            </p>

            <div className={styles.metaPanel}>
              <p><strong>{locale === "en" ? "Author" : "Autor"}:</strong> {auth.profile?.firstName} {auth.profile?.lastName} ({auth.profile?.email ?? auth.user.email})</p>
              <p><strong>{locale === "en" ? "Created" : "Erstellt"}:</strong> {formatTime(locale, eventMeta.createdAt)}</p>
              <p><strong>{locale === "en" ? "Edited" : "Bearbeitet"}:</strong> {formatTime(locale, eventMeta.updatedAt)}</p>
              <p><strong>{locale === "en" ? "Saved" : "Gespeichert"}:</strong> {formatTime(locale, eventMeta.savedAt)}</p>
              <p><strong>{locale === "en" ? "Published" : "Veröffentlicht"}:</strong> {formatTime(locale, eventMeta.publishedAt)}</p>
            </div>

            {eventConfirmation ? (
              <div className={styles.confirmationCard}>
                <h4>{eventConfirmation.mode === "published"
                  ? (locale === "en" ? "Event published" : "Veranstaltung veröffentlicht")
                  : (locale === "en" ? "Draft saved" : "Entwurf gespeichert")}</h4>
                <p>
                  {locale === "en" ? "Saved successfully:" : "Erfolgreich gespeichert:"} {eventConfirmation.title}
                </p>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setEventConfirmation(null)}
                >
                  {locale === "en" ? "Continue editing" : "Weiter bearbeiten"}
                </button>
              </div>
            ) : (
              <div className={styles.actions}>
                <button type="button" className={styles.secondaryAction} onClick={() => void saveEventDraft()} disabled={savingEvent}>
                  {savingEvent ? t(locale, "loading") : locale === "en" ? "Save Draft" : "Entwurf speichern"}
                </button>
                <button type="button" className={styles.primaryAction} onClick={() => void publishEvent()} disabled={savingEvent}>
                  {savingEvent ? t(locale, "loading") : locale === "en" ? "Publish Event" : "Veranstaltung veröffentlichen"}
                </button>
              </div>
            )}
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
