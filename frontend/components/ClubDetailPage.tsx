"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { fetchStrapiCollection, strapiMediaUrl, updateStrapiEntry, type StrapiEntry } from "@/lib/strapi";
import styles from "./ClubDetailPage.module.css";

type ClubMember = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type ClubDetail = {
  documentId?: string;
  slug?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  detailedDescription?: string;
  coverImageUrl?: string;
  contact_email?: string;
  submittedBy?: ClubMember | null;
  members?: ClubMember[];
  gallery?: Array<{ url?: string }>;
};

export default function ClubDetailPage({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const [club, setClub] = useState<StrapiEntry<ClubDetail> | null>(null);
  const [fallbackMembers, setFallbackMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadClub = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data = await fetchStrapiCollection<ClubDetail>("/clubs", {
        locale,
        token: auth?.token,
        query: {
          "filters[slug][$eq]": slug,
          "populate[0]": "submittedBy",
          "populate[1]": "members",
          "populate[2]": "gallery",
        },
      });
      if (!data[0]) {
        data = await fetchStrapiCollection<ClubDetail>("/clubs", {
          locale,
          token: auth?.token,
          query: {
            "filters[documentId][$eq]": slug,
            "populate[0]": "submittedBy",
            "populate[1]": "members",
            "populate[2]": "gallery",
          },
        });
      }
      setClub(data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, locale, slug]);

  useEffect(() => {
    void loadClub();
  }, [loadClub]);

  useEffect(() => {
    if (!auth?.token) return;
    void fetchStrapiCollection<{ firstName?: string; lastName?: string }>("/users", {
      token: auth.token,
      query: {
        "pagination[limit]": 6,
        "sort[0]": "firstName:asc",
      },
    }).then((users) => {
      const names = users
        .map((user) => `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim())
        .filter((name): name is string => Boolean(name));
      setFallbackMembers(names);
    }).catch(() => undefined);
  }, [auth?.token]);

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!club) return <div className={styles.error}>{locale === "en" ? "Club not found." : "Club nicht gefunden."}</div>;

  const leaderName = `${club.submittedBy?.firstName ?? ""} ${club.submittedBy?.lastName ?? ""}`.trim();
  const memberNames = (club.members ?? [])
    .map((member) => `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim())
    .filter((name): name is string => Boolean(name));
  const visibleMembers = memberNames.length > 0 ? memberNames : fallbackMembers;
  const existingMemberIds = (club.members ?? [])
    .map((member) => member.documentId)
    .filter((id): id is string => Boolean(id));
  const canJoin =
    (auth?.appRole === "Student" || auth?.appRole === "ExchangeStudent") &&
    Boolean(auth.profile?.documentId) &&
    Boolean(club.documentId) &&
    !existingMemberIds.includes(auth.profile?.documentId ?? "");

  async function joinClub() {
    if (!club || !canJoin || !auth?.token || !auth.profile?.documentId || !club.documentId) return;
    try {
      setJoining(true);
      setError(null);
      await updateStrapiEntry(
        `/clubs/${club.documentId}`,
        { members: [...existingMemberIds, auth.profile.documentId] },
        { token: auth.token, locale }
      );
      await loadClub();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <article className={styles.detailPage}>
      <Link href="/clubs" className={styles.backLink}>
        {locale === "en" ? "← Back to Clubs" : "← Zurück zu Clubs"}
      </Link>

      {club.coverImageUrl ? (
        <img src={strapiMediaUrl(club.coverImageUrl) ?? club.coverImageUrl} alt={club.title ?? "Club"} className={styles.heroImage} />
      ) : null}

      <h1>{club.title}</h1>
      <p className={styles.subtitle}>{club.shortDescription}</p>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.section}>
            <h2>{locale === "en" ? "Description" : "Beschreibung"}</h2>
            <p>{club.detailedDescription ?? club.description}</p>
          </section>

          <section className={styles.section}>
            <h2>{locale === "en" ? "Gallery" : "Galerie"}</h2>
            {club.gallery && club.gallery.length > 0 ? (
              <div className={styles.gallery}>
                {club.gallery.map((image, index) => (
                  <img key={`${image.url ?? "gallery"}-${index}`} src={strapiMediaUrl(image.url) ?? ""} alt={`${club.title ?? "Club"} ${index + 1}`} className={styles.galleryImage} />
                ))}
              </div>
            ) : (
              <p>{locale === "en" ? "No gallery images available yet." : "Noch keine Galerie-Bilder verfügbar."}</p>
            )}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.section}>
            <h2>{locale === "en" ? "Club leader + contact" : "Club-Leitung + Kontakt"}</h2>
            <p>{leaderName || (locale === "en" ? "Not specified" : "Nicht angegeben")}</p>
            <p>{club.contact_email || club.submittedBy?.email || "-"}</p>
            {(auth?.appRole === "Student" || auth?.appRole === "ExchangeStudent") ? (
              <button
                type="button"
                className={styles.joinButton}
                disabled={!canJoin || joining}
                onClick={() => void joinClub()}
              >
                {!canJoin
                  ? locale === "en" ? "✓ Joined" : "✓ Beigetreten"
                  : joining
                    ? t(locale, "loading")
                    : locale === "en"
                      ? "Join Club"
                      : "Club beitreten"}
              </button>
            ) : null}
          </section>

          <section className={styles.section}>
            <h2>{locale === "en" ? "Members" : "Mitglieder"}</h2>
            <ul className={styles.memberList}>
              {visibleMembers.length > 0 ? (
                visibleMembers.map((memberName) => (
                  <li key={memberName}>{memberName}</li>
                ))
              ) : (
                <li>{locale === "en" ? "No member names available." : "Keine Mitgliedernamen verfügbar."}</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </article>
  );
}
