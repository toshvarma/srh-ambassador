"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import type { UserRole } from "@/lib/roles";
import { fetchStrapiCollection, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import styles from "./NewsPage.module.css";

type NewsTag = {
  documentId?: string;
  name?: string;
};

type NewsArticle = {
  documentId?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImageUrl?: string;
  courseLabel?: string;
  publishedAt?: string;
  status?: string;
  featuredImage?: { url?: string } | null;
  author?: { firstName?: string; lastName?: string } | null;
  category?: { name?: string } | null;
  visibility?: "all" | "student" | "professor";
  relatedClub?: { documentId?: string; title?: string } | null;
  tags?: NewsTag[];
};

function canViewByRole(role: UserRole | null, visibility: NewsArticle["visibility"]): boolean {
  if (!visibility || visibility === "all") return true;
  if (!role) return false;
  if (role === "Ambassador" || role === "Admin" || role === "SuperAdmin" || role === "Teacher") return true;
  if (visibility === "student") return role === "Student" || role === "ExchangeStudent";
  if (visibility === "professor") return role === "Professor";
  return false;
}

function getArticleTags(article: StrapiEntry<NewsArticle>, locale: "en" | "de"): string[] {
  const tagNames = (article.tags ?? [])
    .map((tag) => tag.name?.trim())
    .filter((tag): tag is string => Boolean(tag));
  if (tagNames.length > 0) return tagNames;
  if (article.relatedClub?.title?.trim()) return [article.relatedClub.title.trim()];
  return [locale === "en" ? "SRH Announcement" : "SRH Ankündigung"];
}

export default function NewsPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();

  const [news, setNews] = useState<Array<StrapiEntry<NewsArticle>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [newsFilter, setNewsFilter] = useState<"all" | "club" | "course">("all");
  const [myClubIds, setMyClubIds] = useState<string[]>([]);
  const pageSize = 9;

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

  const fetchNews = useCallback(async (nextPage: number, currentFilter: "all" | "club" | "course") => {
    try {
      setLoading(true);
      setError(null);
      const query: Record<string, string | number | undefined> = {
        "pagination[page]": nextPage,
        "pagination[pageSize]": pageSize,
        "sort[0]": "publishedAt:desc",
      };
      if (currentFilter === "club" && myClubIds.length > 0) {
        myClubIds.forEach((id, index) => {
          query[`filters[relatedClub][documentId][$in][${index}]`] = id;
        });
      }
      const data = await fetchStrapiCollection<NewsArticle>("/news-items", {
        locale,
        token: auth?.token,
        query: {
          ...query,
          "populate[0]": "author",
          "populate[1]": "category",
          "populate[2]": "featuredImage",
          "populate[3]": "relatedClub",
          "populate[4]": "tags",
        },
      });
      const role = auth?.appRole ?? null;
      const visibleNews = data.filter((item) => canViewByRole(role, item.visibility));
      const filteredNews = visibleNews.filter((item) => {
        if (currentFilter === "all") return true;
        if (currentFilter === "club") return myClubIds.length > 0 && Boolean(item.relatedClub?.documentId);
        if (role === "Student" || role === "ExchangeStudent") return item.visibility === "student" || item.courseLabel === "Student";
        if (role === "Professor") return item.visibility === "professor" || item.courseLabel === "Professor";
        if (role === "Teacher" || role === "Ambassador" || role === "Admin" || role === "SuperAdmin") {
          return item.visibility === "student" || item.visibility === "professor" || Boolean(item.courseLabel);
        }
        return false;
      });
      setNews(filteredNews);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, locale, myClubIds]);

  useEffect(() => {
    void fetchNews(page, newsFilter);
  }, [fetchNews, newsFilter, page]);

  const featuredArticle = useMemo(
    () => news.find((article) => article.visibility === "student" || article.visibility === "professor") ?? null,
    [news]
  );
  const regularNews = useMemo(
    () => news.filter((article) => article.documentId !== featuredArticle?.documentId),
    [news, featuredArticle]
  );

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;

  return (
    <div className={styles.newsPage}>
      <aside className={styles.sidebar}>
        <h1>{t(locale, "latestNews")}</h1>

        <div className={styles.sideSection}>
          <h2>{locale === "en" ? "All News" : "Alle Nachrichten"}</h2>
          <button
            type="button"
            className={`${styles.filterButton} ${newsFilter === "all" ? styles.filterButtonActive : ""}`}
            onClick={() => { setNewsFilter("all"); setPage(1); }}
          >
            {locale === "en" ? "All News" : "Alle Nachrichten"}
          </button>
        </div>

        <div className={styles.sideSection}>
          <h2>{locale === "en" ? "Filter" : "Filter"}</h2>
          <button
            type="button"
            className={`${styles.filterButton} ${newsFilter === "club" ? styles.filterButtonActive : ""}`}
            onClick={() => { setNewsFilter("club"); setPage(1); }}
          >
            {locale === "en" ? "My Club News" : "Meine Club-News"}
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${newsFilter === "course" ? styles.filterButtonActive : ""}`}
            onClick={() => { setNewsFilter("course"); setPage(1); }}
          >
            {locale === "en" ? "My Course News" : "Meine Kurs-News"}
          </button>
          {newsFilter === "club" && myClubIds.length === 0 ? (
            <p className={styles.sideHint}>
              {locale === "en"
                ? "No club memberships found yet."
                : "Noch keine Club-Mitgliedschaften gefunden."}
            </p>
          ) : null}
        </div>
      </aside>

      <section className={styles.content}>
        {error ? <div className={styles.error}>{error}</div> : null}

        {news.length === 0 ? (
          <div className={styles.noNews}>{t(locale, "noData")}</div>
        ) : (
          <>
            {featuredArticle ? (
              <div className={styles.featured}>
                <div className={styles.tagRow}>
                  {getArticleTags(featuredArticle, locale).map((tagLabel) => (
                    <span key={tagLabel} className={styles.tagBadge}>{tagLabel}</span>
                  ))}
                </div>
                {featuredArticle.featuredImage?.url || featuredArticle.featuredImageUrl ? (
                  <img
                    src={strapiMediaUrl(featuredArticle.featuredImage?.url) ?? featuredArticle.featuredImageUrl ?? ""}
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
                    ? ` · ${new Date(featuredArticle.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "de-DE")}`
                    : ""}
                </p>
                <Link
                  href={`/news/${featuredArticle.slug ?? featuredArticle.documentId ?? featuredArticle.id ?? ""}`}
                  className={styles.readMoreButton}
                >
                  {locale === "en" ? "Read more" : "Mehr lesen"}
                </Link>
              </div>
            ) : null}

            <div className={styles.newsGrid}>
              {regularNews.map((article) => (
                <article key={article.documentId ?? article.id} className={styles.newsCard}>
                  {article.featuredImage?.url || article.featuredImageUrl ? (
                    <img
                      src={strapiMediaUrl(article.featuredImage?.url) ?? article.featuredImageUrl ?? ""}
                      alt={article.title ?? ""}
                      className={styles.cardImage}
                    />
                  ) : (
                    <div className={styles.cardImagePlaceholder} />
                  )}
                  <div className={styles.cardBody}>
                    <div className={styles.tagRow}>
                      {getArticleTags(article, locale).map((tagLabel) => (
                        <span key={`${article.documentId ?? article.id}-${tagLabel}`} className={styles.tagBadge}>
                          {tagLabel}
                        </span>
                      ))}
                    </div>
                    <h3 className={styles.cardTitle}>{article.title}</h3>
                    <p className={styles.cardExcerpt}>{article.excerpt}</p>
                    <p className={styles.cardMeta}>
                      {article.author
                        ? `${article.author.firstName ?? ""} ${article.author.lastName ?? ""}`.trim()
                        : ""}
                      {article.publishedAt
                        ? ` · ${new Date(article.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "de-DE")}`
                        : ""}
                    </p>
                    <Link
                      href={`/news/${article.slug ?? article.documentId ?? article.id ?? ""}`}
                      className={styles.readMoreButton}
                    >
                      {locale === "en" ? "Read more" : "Mehr lesen"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span>{page}</span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={news.length < pageSize}
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
