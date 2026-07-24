"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { resolveFirstMediaUrl } from "@/lib/media";
import { fetchStrapiCollection, type StrapiEntry } from "@/lib/strapi";
import styles from "./ClubsPage.module.css";

type ClubMember = {
  id?: number;
  documentId?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
};

type Club = {
  id?: number;
  documentId?: string;
  slug?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  detailedDescription?: string;
  contact_email?: string;
  contactEmail?: string;
  coverImageUrl?: string;
  coverImage?: { url?: string } | null;
  cover_image?: unknown;
  ambassadorFeedback?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  submittedBy?: ClubMember | null;
  members?: ClubMember[];
};

export default function ClubsPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();

  const [clubs, setClubs] = useState<Array<StrapiEntry<Club>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const approvedClubs = useMemo(
    () => clubs.filter((club) => club.approvalStatus === "approved"),
    [clubs]
  );

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStrapiCollection<Club>("/clubs", {
        locale,
        token: auth?.token,
        query: {
          "populate[0]": "submittedBy",
          "populate[1]": "members",
          "sort[0]": "title:asc",
        },
      });
      setClubs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, locale]);

  useEffect(() => {
    void fetchClubs();
  }, [fetchClubs]);

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;

  return (
    <div className={styles.clubsPage}>
      <aside className={styles.sidebar}>
        <h1>{t(locale, "ourClubs")}</h1>
        {capabilities.canSubmitClubIdea ? (
          <div className={styles.sidebarActions}>
            <Link href="/clubs/new" className={styles.actionButton}>
              {locale === "en" ? "Create Club Request" : "Club-Anfrage erstellen"}
            </Link>
          </div>
        ) : null}
        <div className={styles.sideSection}>
          <h2>{locale === "en" ? "All Clubs" : "Alle Clubs"}</h2>
          <p className={styles.sideHint}>
            {locale === "en"
              ? "Open a club to see full details, members, and gallery."
              : "Öffnen Sie einen Club, um alle Details, Mitglieder und die Galerie zu sehen."}
          </p>
        </div>
      </aside>

      <section className={styles.content}>
        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.cards}>
          {approvedClubs.length === 0 ? (
            <div className={styles.noClubs}>{t(locale, "noData")}</div>
          ) : (
            approvedClubs.map((club) => {
              const coverImageSrc = resolveFirstMediaUrl(club.coverImageUrl, club.coverImage, club.cover_image);
              const contactEmail = club.contact_email ?? club.contactEmail ?? club.submittedBy?.email ?? "-";
              return (
              <article key={club.documentId ?? club.id} className={styles.clubCard}>
                {coverImageSrc ? (
                  <img
                    src={coverImageSrc}
                    alt={club.title ?? "Club"}
                    className={styles.clubImage}
                  />
                ) : (
                  <div className={styles.clubImagePlaceholder} />
                )}
                <div className={styles.clubCardBody}>
                  <h3>{club.title}</h3>
                  <p className={styles.clubShortDesc}>{club.shortDescription}</p>
                  <p className={styles.clubMeta}>
                    {locale === "en" ? "Members" : "Mitglieder"}: {(club.members ?? []).length} ·{" "}
                    {locale === "en" ? "Contact" : "Kontakt"}: {contactEmail}
                  </p>
                  <Link
                    href={`/clubs/${club.slug ?? club.documentId ?? club.id ?? ""}`}
                    className={styles.readMoreButton}
                  >
                    {locale === "en" ? "Read more" : "Mehr lesen"}
                  </Link>
                  {club.ambassadorFeedback ? <p className={styles.feedback}>{club.ambassadorFeedback}</p> : null}
                </div>
              </article>
              );
            })
          )}
        </section>
      </section>
    </div>
  );
}
