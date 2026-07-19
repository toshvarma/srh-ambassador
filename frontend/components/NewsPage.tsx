"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import type { UserRole } from "@/lib/roles";
import { createStrapiEntry, fetchStrapiCollection, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import styles from "./NewsPage.module.css";

type NewsArticle = {
  documentId?: string;
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  status?: string;
  featuredImage?: { url?: string } | null;
  author?: { firstName?: string; lastName?: string } | null;
  category?: { name?: string } | null;
  visibility?: "all" | "student" | "professor";
  relatedClub?: { documentId?: string; title?: string } | null;
};

function canViewByRole(role: UserRole | null, visibility: NewsArticle["visibility"]): boolean {
  if (!visibility || visibility === "all") return true;
  if (!role) return false;
  // Staff / admin roles see everything
  if (role === "Ambassador" || role === "Admin" || role === "SuperAdmin" || role === "Teacher") return true;
  if (visibility === "student") return role === "Student" || role === "ExchangeStudent";
  if (visibility === "professor") return role === "Professor";
  return false;
}

export default function NewsPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();

  const [news, setNews] = useState<Array<StrapiEntry<NewsArticle>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [myClubFilter, setMyClubFilter] = useState(false);
  const [myClubIds, setMyClubIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newsInput, setNewsInput] = useState({
    title: "",
    excerpt: "",
    content: "",
    visibility: "all" as "all" | "student" | "professor",
  });
  const pageSize = 9;

  // Fetch user's club memberships once on login
  useEffect(() => {
    if (!auth?.token || !auth.profile?.documentId) return;
    const profileId = auth.profile.documentId;
    void fetchStrapiCollection<{ documentId?: string }>(
      `/clubs?filters[members][documentId][$eq]=${profileId}&pagination[limit]=50`,
      { token: auth.token }
    ).then((clubs) => {
      setMyClubIds(clubs.map((c) => c.documentId).filter((id): id is string => !!id));
    }).catch(() => undefined);
  }, [auth?.token, auth?.profile?.documentId]);

  const fetchNews = useCallback(async (nextPage: number, clubFilter: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const query: Record<string, string | number | undefined> = {
        "pagination[page]": nextPage,
        "pagination[pageSize]": pageSize,
        "sort[0]": "publishedAt:desc",
      };
      if (clubFilter && myClubIds.length > 0) {
        myClubIds.forEach((id, i) => {
          query[`filters[relatedClub][documentId][$in][${i}]`] = id;
        });
      }
      const data = await fetchStrapiCollection<NewsArticle>(
        "/news-items?populate=author,category,featuredImage,relatedClub",
        { locale, token: auth?.token, query }
      );
      setNews(data.filter((item) => canViewByRole(auth?.appRole ?? null, item.visibility)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, locale, myClubIds]);

  useEffect(() => {
    void fetchNews(page, myClubFilter);
  }, [fetchNews, page, myClubFilter]);

  async function publishNews(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth?.token) return;
    try {
      setSubmitting(true);
      await createStrapiEntry(
        "/news-items",
        { ...newsInput, status: "published", publishedAt: new Date().toISOString() },
        { token: auth.token, locale }
      );
      setNewsInput({ title: "", excerpt: "", content: "", visibility: "all" });
      setShowForm(false);
      setPage(1);
      await fetchNews(1, myClubFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSubmitting(false);
    }
  }

  // The most recent visibility-restricted article gets a featured slot at the top
  const featuredArticle = useMemo(
    () => news.find((a) => a.visibility === "student" || a.visibility === "professor") ?? null,
    [news]
  );
  const regularNews = useMemo(
    () => news.filter((a) => a.documentId !== featuredArticle?.documentId),
    [news, featuredArticle]
  );

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;

  return (
    <div className={styles.newsPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h1>{t(locale, "latestNews")}</h1>
          {capabilities.canManageNews ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setShowForm((s) => !s)}
            >
              {showForm
                ? locale === "en" ? "Cancel" : "Abbrechen"
                : locale === "en" ? "Publish New" : "Artikel veröffentlichen"}
            </button>
          ) : null}
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterChip} ${!myClubFilter ? styles.filterChipActive : ""}`}
            onClick={() => { setMyClubFilter(false); setPage(1); }}
          >
            {locale === "en" ? "All News" : "Alle Nachrichten"}
          </button>
          {myClubIds.length > 0 ? (
            <button
              type="button"
              className={`${styles.filterChip} ${myClubFilter ? styles.filterChipActive : ""}`}
              onClick={() => { setMyClubFilter(true); setPage(1); }}
            >
              {locale === "en" ? "My Club News" : "Meine Club-News"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {/* Publish form */}
      {showForm ? (
        <form className={styles.publishForm} onSubmit={publishNews}>
          <h2>{locale === "en" ? "Publish a new article" : "Neuen Artikel veröffentlichen"}</h2>
          <input
            value={newsInput.title}
            onChange={(e) => setNewsInput((c) => ({ ...c, title: e.target.value }))}
            placeholder={t(locale, "title")}
            required
          />
          <input
            value={newsInput.excerpt}
            onChange={(e) => setNewsInput((c) => ({ ...c, excerpt: e.target.value }))}
            placeholder={t(locale, "excerpt")}
            required
          />
          <textarea
            value={newsInput.content}
            onChange={(e) => setNewsInput((c) => ({ ...c, content: e.target.value }))}
            placeholder={t(locale, "content")}
            rows={5}
            required
          />
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              {locale === "en" ? "Audience:" : "Zielgruppe:"}
              <select
                value={newsInput.visibility}
                onChange={(e) =>
                  setNewsInput((c) => ({ ...c, visibility: e.target.value as "all" | "student" | "professor" }))
                }
                className={styles.formSelect}
              >
                <option value="all">{locale === "en" ? "All users" : "Alle Nutzer"}</option>
                <option value="student">{locale === "en" ? "Students only" : "Nur Studierende"}</option>
                <option value="professor">{locale === "en" ? "Professors only" : "Nur Professoren"}</option>
              </select>
            </label>
          </div>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? t(locale, "loading") : locale === "en" ? "Publish" : "Veröffentlichen"}
          </button>
        </form>
      ) : null}

      {news.length === 0 ? (
        <div className={styles.noNews}>{t(locale, "noData")}</div>
      ) : (
        <>
          {/* Featured exclusive article */}
          {featuredArticle ? (
            <div className={styles.featured}>
              <span
                className={`${styles.exclusiveBadge} ${
                  featuredArticle.visibility === "student"
                    ? styles.exclusiveStudent
                    : styles.exclusiveProfessor
                }`}
              >
                {featuredArticle.visibility === "student"
                  ? locale === "en" ? "✦ Students only" : "✦ Nur für Studierende"
                  : locale === "en" ? "✦ Professors only" : "✦ Nur für Professoren"}
              </span>
              {featuredArticle.featuredImage?.url ? (
                <img
                  src={strapiMediaUrl(featuredArticle.featuredImage.url) ?? ""}
                  alt={featuredArticle.title ?? ""}
                  className={styles.featuredImage}
                />
              ) : null}
              <h2 className={styles.featuredTitle}>{featuredArticle.title}</h2>
              <p className={styles.featuredExcerpt}>{featuredArticle.excerpt}</p>
              <p className={styles.featuredMeta}>
                {featuredArticle.author
                  ? `${featuredArticle.author.firstName ?? ""} ${featuredArticle.author.lastName ?? ""}`.trim()
                  : ""}
                {featuredArticle.publishedAt
                  ? ` · ${new Date(featuredArticle.publishedAt).toLocaleDateString(
                      locale === "en" ? "en-US" : "de-DE"
                    )}`
                  : ""}
              </p>
            </div>
          ) : null}

          {/* Regular news grid */}
          <div className={styles.newsGrid}>
            {regularNews.map((article) => (
              <article key={article.documentId ?? article.id} className={styles.newsCard}>
                {article.featuredImage?.url ? (
                  <img
                    src={strapiMediaUrl(article.featuredImage.url) ?? ""}
                    alt={article.title ?? ""}
                    className={styles.cardImage}
                  />
                ) : (
                  <div className={styles.cardImagePlaceholder} />
                )}
                <div className={styles.cardBody}>
                  {article.relatedClub?.title ? (
                    <span className={styles.clubBadge}>{article.relatedClub.title}</span>
                  ) : null}
                  <h3 className={styles.cardTitle}>{article.title}</h3>
                  <p className={styles.cardExcerpt}>{article.excerpt}</p>
                  <p className={styles.cardMeta}>
                    {article.author
                      ? `${article.author.firstName ?? ""} ${article.author.lastName ?? ""}`.trim()
                      : ""}
                    {article.publishedAt
                      ? ` · ${new Date(article.publishedAt).toLocaleDateString(
                          locale === "en" ? "en-US" : "de-DE"
                        )}`
                      : ""}
                  </p>
                </div>
              </article>
            ))}
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
              disabled={news.length < pageSize}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
