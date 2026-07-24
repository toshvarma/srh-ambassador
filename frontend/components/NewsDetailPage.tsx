"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { fetchStrapiCollection, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import styles from "./NewsDetailPage.module.css";

type NewsTag = {
  name?: string;
};

type NewsDetail = {
  documentId?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImageUrl?: string;
  publishedAt?: string;
  featuredImage?: { url?: string } | null;
  author?: { firstName?: string; lastName?: string } | null;
  relatedClub?: { title?: string } | null;
  tags?: NewsTag[];
};

export default function NewsDetailPage({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const [article, setArticle] = useState<StrapiEntry<NewsDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArticle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data = await fetchStrapiCollection<NewsDetail>("/news-items", {
        locale,
        token: auth?.token,
        query: {
          "filters[slug][$eq]": slug,
          "populate[0]": "author",
          "populate[1]": "featuredImage",
          "populate[2]": "relatedClub",
          "populate[3]": "tags",
        },
      });
      if (!data[0]) {
        data = await fetchStrapiCollection<NewsDetail>("/news-items", {
          locale,
          token: auth?.token,
          query: {
            "filters[documentId][$eq]": slug,
            "populate[0]": "author",
            "populate[1]": "featuredImage",
            "populate[2]": "relatedClub",
            "populate[3]": "tags",
          },
        });
      }
      setArticle(data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, locale, slug]);

  useEffect(() => {
    void loadArticle();
  }, [loadArticle]);

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!article) return <div className={styles.error}>{locale === "en" ? "Article not found." : "Artikel nicht gefunden."}</div>;

  const tags = (article.tags ?? []).map((tag) => tag.name).filter((name): name is string => Boolean(name));

  return (
    <article className={styles.detailPage}>
      <Link href="/news" className={styles.backLink}>
        {locale === "en" ? "← Back to News" : "← Zurück zu Nachrichten"}
      </Link>
      {article.featuredImage?.url || article.featuredImageUrl ? (
        <img
          src={strapiMediaUrl(article.featuredImage?.url) ?? article.featuredImageUrl ?? ""}
          alt={article.title ?? "News"}
          className={styles.heroImage}
        />
      ) : null}
      <h1>{article.title}</h1>
      <p className={styles.meta}>
        {article.author ? `${article.author.firstName ?? ""} ${article.author.lastName ?? ""}`.trim() : ""}
        {article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "de-DE")}` : ""}
      </p>
      {tags.length > 0 || article.relatedClub?.title ? (
        <div className={styles.tagRow}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tagBadge}>{tag}</span>
          ))}
          {tags.length === 0 && article.relatedClub?.title ? (
            <span className={styles.tagBadge}>{article.relatedClub.title}</span>
          ) : null}
        </div>
      ) : null}
      {article.excerpt ? <p className={styles.excerpt}>{article.excerpt}</p> : null}
      <section className={styles.body}>
        <h2>{locale === "en" ? "Full article" : "Vollständiger Artikel"}</h2>
        <ReactMarkdown>{article.content ?? article.excerpt ?? ""}</ReactMarkdown>
      </section>
    </article>
  );
}
