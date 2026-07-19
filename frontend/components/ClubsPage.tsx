"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { createStrapiEntry, fetchStrapiCollection, updateStrapiEntry, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import styles from "./ClubsPage.module.css";

type ClubMember = {
  id?: number;
  documentId?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

type Club = {
  id?: number;
  documentId?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  detailedDescription?: string;
  contact_email?: string;
  coverImageUrl?: string;
  minimumMembers?: number;
  maximumMembers?: number;
  specialEquipmentRequired?: string;
  meetingFrequency?: string;
  recommendedFor?: string;
  signupNotes?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [moderation, setModeration] = useState<Record<string, string>>({});
  const [idea, setIdea] = useState({
    title: "",
    shortDescription: "",
    detailedDescription: "",
    contact_email: "",
    minimumMembers: 5,
    maximumMembers: 30,
    specialEquipmentRequired: "",
    meetingFrequency: "",
    recommendedFor: "",
    signupNotes: "",
    coverImageUrl: "",
  });

  const approvedClubs = useMemo(
    () => clubs.filter((club) => club.approvalStatus === "approved"),
    [clubs]
  );

  const pendingClubs = useMemo(
    () => clubs.filter((club) => club.approvalStatus === "pending"),
    [clubs]
  );

  const myClubs = useMemo(
    () =>
      auth?.profile?.documentId
        ? approvedClubs.filter((club) =>
            (club.members ?? []).some((m) => m.documentId === auth.profile!.documentId)
          )
        : [],
    [approvedClubs, auth]
  );

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStrapiCollection<Club>(
        "/clubs?populate=submittedBy,members",
        { locale, token: auth?.token }
      );
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

  async function submitClubIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.profile?.documentId) {
      setError(
        locale === "en"
          ? "Please sign in with a valid profile first."
          : "Bitte melden Sie sich zuerst mit einem gültigen Profil an."
      );
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await createStrapiEntry(
        "/clubs",
        {
          title: idea.title,
          shortDescription: idea.shortDescription,
          description: idea.shortDescription,
          detailedDescription: idea.detailedDescription,
          contact_email: idea.contact_email,
          minimumMembers: Number(idea.minimumMembers),
          maximumMembers: Number(idea.maximumMembers),
          specialEquipmentRequired: idea.specialEquipmentRequired,
          meetingFrequency: idea.meetingFrequency,
          recommendedFor: idea.recommendedFor,
          signupNotes: idea.signupNotes,
          coverImageUrl: idea.coverImageUrl || null,
          approvalStatus: "pending",
          submittedBy: auth.profile.documentId,
        },
        { token: auth.token, locale }
      );
      setIdea({
        title: "",
        shortDescription: "",
        detailedDescription: "",
        contact_email: "",
        minimumMembers: 5,
        maximumMembers: 30,
        specialEquipmentRequired: "",
        meetingFrequency: "",
        recommendedFor: "",
        signupNotes: "",
        coverImageUrl: "",
      });
      setShowForm(false);
      await fetchClubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function moderateClub(
    documentId: string | undefined,
    nextStatus: "approved" | "rejected" | "pending"
  ) {
    if (!auth?.token || !capabilities.canApproveClubIdea || !documentId) return;
    const feedback = moderation[documentId] ?? "";
    if (nextStatus === "pending" && !feedback.trim()) {
      setError(
        locale === "en"
          ? "Please add change suggestions before submitting."
          : "Bitte geben Sie zunächst Änderungsvorschläge ein."
      );
      return;
    }
    await updateStrapiEntry(
      `/clubs/${documentId}`,
      { approvalStatus: nextStatus, ambassadorFeedback: feedback || null },
      { token: auth.token, locale }
    );
    await fetchClubs();
  }

  async function joinClub(club: StrapiEntry<Club>) {
    if (!auth?.token || !auth.profile?.documentId || !club.documentId) return;
    const existingMemberIds = (club.members ?? [])
      .map((m) => m.documentId)
      .filter((id): id is string => typeof id === "string");
    if (existingMemberIds.includes(auth.profile.documentId)) return;
    await updateStrapiEntry(
      `/clubs/${club.documentId}`,
      { members: [...existingMemberIds, auth.profile.documentId] },
      { token: auth.token, locale }
    );
    await fetchClubs();
  }

  if (loading) {
    return <div className={styles.loading}>{t(locale, "loading")}</div>;
  }

  return (
    <div className={styles.clubsPage}>
      {/* Header with action buttons */}
      <div className={styles.header}>
        <h1>{t(locale, "ourClubs")}</h1>
        <div className={styles.headerActions}>
          {capabilities.canSubmitClubIdea ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => { setShowForm((prev) => !prev); setShowReview(false); }}
            >
              {showForm
                ? locale === "en" ? "Cancel" : "Abbrechen"
                : locale === "en" ? "Create a Club" : "Club gründen"}
            </button>
          ) : null}
          {capabilities.canApproveClubIdea ? (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.reviewButton}`}
              onClick={() => { setShowReview((prev) => !prev); setShowForm(false); }}
            >
              {showReview
                ? locale === "en" ? "Close Review" : "Prüfung schließen"
                : locale === "en" ? `Review Clubs (${pendingClubs.length})` : `Clubs prüfen (${pendingClubs.length})`}
            </button>
          ) : null}
        </div>
      </div>

      {/* Club submission form (students) */}
      {showForm && capabilities.canSubmitClubIdea ? (
        <form className={styles.form} onSubmit={submitClubIdea}>
          <h2>{locale === "en" ? "Submit a club idea" : "Club-Idee einreichen"}</h2>
          <input
            type="text"
            value={idea.title}
            onChange={(e) => setIdea((c) => ({ ...c, title: e.target.value }))}
            placeholder={locale === "en" ? "Club name" : "Clubname"}
            required
          />
          <textarea
            value={idea.shortDescription}
            onChange={(e) => setIdea((c) => ({ ...c, shortDescription: e.target.value }))}
            placeholder={locale === "en" ? "Short description (1-2 lines)" : "Kurzbeschreibung (1-2 Zeilen)"}
            rows={2}
            required
          />
          <textarea
            value={idea.detailedDescription}
            onChange={(e) => setIdea((c) => ({ ...c, detailedDescription: e.target.value }))}
            placeholder={locale === "en" ? "Detailed description" : "Ausführliche Beschreibung"}
            rows={5}
            required
          />
          <input
            type="email"
            value={idea.contact_email}
            onChange={(e) => setIdea((c) => ({ ...c, contact_email: e.target.value }))}
            placeholder="club@srh.de"
            required
          />
          <input
            type="url"
            value={idea.coverImageUrl}
            onChange={(e) => setIdea((c) => ({ ...c, coverImageUrl: e.target.value }))}
            placeholder={locale === "en" ? "Picture URL (optional)" : "Bild-URL (optional)"}
          />
          <div className={styles.formGrid}>
            <input
              type="number"
              min={2}
              value={idea.minimumMembers}
              onChange={(e) => setIdea((c) => ({ ...c, minimumMembers: Number(e.target.value) }))}
              placeholder={locale === "en" ? "Min. members" : "Mindestmitglieder"}
              required
            />
            <input
              type="number"
              min={2}
              value={idea.maximumMembers}
              onChange={(e) => setIdea((c) => ({ ...c, maximumMembers: Number(e.target.value) }))}
              placeholder={locale === "en" ? "Max. members" : "Höchstmitglieder"}
              required
            />
          </div>
          <input
            type="text"
            value={idea.specialEquipmentRequired}
            onChange={(e) => setIdea((c) => ({ ...c, specialEquipmentRequired: e.target.value }))}
            placeholder={locale === "en" ? "Special equipment required" : "Benötigte Spezialausstattung"}
          />
          <input
            type="text"
            value={idea.meetingFrequency}
            onChange={(e) => setIdea((c) => ({ ...c, meetingFrequency: e.target.value }))}
            placeholder={locale === "en" ? "Meeting frequency (e.g. Weekly)" : "Treffhäufigkeit (z.B. Wöchentlich)"}
          />
          <input
            type="text"
            value={idea.recommendedFor}
            onChange={(e) => setIdea((c) => ({ ...c, recommendedFor: e.target.value }))}
            placeholder={locale === "en" ? "Recommended for" : "Empfohlen für"}
          />
          <textarea
            value={idea.signupNotes}
            onChange={(e) => setIdea((c) => ({ ...c, signupNotes: e.target.value }))}
            placeholder={locale === "en" ? "Additional signup notes" : "Zusatzhinweise zur Anmeldung"}
            rows={3}
          />
          <div className={styles.autofillInfo}>
            {locale === "en" ? "Created by:" : "Erstellt von:"}{" "}
            {auth?.profile?.firstName} {auth?.profile?.lastName} ({auth?.profile?.email ?? auth?.user?.email})
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? t(locale, "loading") : t(locale, "submitClubIdea")}
          </button>
        </form>
      ) : null}

      {/* Ambassador review queue */}
      {showReview && capabilities.canApproveClubIdea ? (
        <section className={styles.reviewPanel}>
          <h2>{locale === "en" ? "Ambassador review queue" : "Botschafter-Prüfwarteschlange"}</h2>
          {pendingClubs.length === 0 ? (
            <p>{locale === "en" ? "No pending submissions." : "Keine ausstehenden Einreichungen."}</p>
          ) : (
            pendingClubs.map((club) => (
              <article key={club.documentId ?? club.id} className={styles.reviewCard}>
                <strong>{club.title}</strong>
                <p>{club.shortDescription}</p>
                <textarea
                  value={moderation[club.documentId ?? ""] ?? ""}
                  onChange={(e) =>
                    setModeration((c) => ({ ...c, [club.documentId ?? ""]: e.target.value }))
                  }
                  placeholder={locale === "en" ? "Feedback / suggested changes" : "Feedback / Änderungsvorschläge"}
                  rows={3}
                />
                <div className={styles.reviewActions}>
                  <button
                    type="button"
                    className={styles.approveButton}
                    onClick={() => void moderateClub(club.documentId, "approved")}
                  >
                    {t(locale, "approve")}
                  </button>
                  <button
                    type="button"
                    className={styles.rejectButton}
                    onClick={() => void moderateClub(club.documentId, "rejected")}
                  >
                    {t(locale, "reject")}
                  </button>
                  <button
                    type="button"
                    className={styles.suggestButton}
                    onClick={() => void moderateClub(club.documentId, "pending")}
                  >
                    {locale === "en" ? "Suggest changes" : "Änderungen vorschlagen"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {/* Your Clubs section — always visible */}
      <section className={styles.yourClubsSection}>
        <h2>{locale === "en" ? "Your Clubs" : "Deine Clubs"}</h2>
        {myClubs.length === 0 ? (
          <p className={styles.emptyState}>
            {locale === "en"
              ? 'You haven\'t joined any clubs yet. Browse below and click "Join" to get started.'
              : 'Du bist noch keinem Club beigetreten. Klicke auf "Beitreten" um zu starten.'}
          </p>
        ) : (
          <div className={styles.yourClubsGrid}>
            {myClubs.map((club) => (
              <div key={club.documentId ?? club.id} className={styles.yourClubChip}>
                {club.title}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All approved clubs */}
      <section className={styles.cards}>
        {approvedClubs.length === 0 ? (
          <div className={styles.noClubs}>{t(locale, "noData")}</div>
        ) : (
          approvedClubs.map((club) => {
            const memberIds = (club.members ?? [])
              .map((m) => m.documentId)
              .filter((id): id is string => typeof id === "string");
            const alreadyMember =
              auth?.profile?.documentId ? memberIds.includes(auth.profile.documentId) : false;
            return (
              <article key={club.documentId ?? club.id} className={styles.clubCard}>
                {club.coverImageUrl ? (
                  <img
                    src={strapiMediaUrl(club.coverImageUrl) ?? club.coverImageUrl}
                    alt={club.title ?? "Club"}
                    className={styles.clubImage}
                  />
                ) : null}
                <h3>{club.title}</h3>
                <p>{club.shortDescription}</p>
                <details>
                  <summary>{locale === "en" ? "Read more" : "Mehr lesen"}</summary>
                  <p>{club.detailedDescription ?? club.description}</p>
                  <ul>
                    <li>
                      {locale === "en" ? "Members" : "Mitglieder"}:{" "}
                      {club.minimumMembers ?? "-"} – {club.maximumMembers ?? "-"}
                    </li>
                    <li>
                      {locale === "en" ? "Equipment" : "Ausstattung"}:{" "}
                      {club.specialEquipmentRequired ?? "-"}
                    </li>
                    <li>
                      {locale === "en" ? "Meeting frequency" : "Treffhäufigkeit"}:{" "}
                      {club.meetingFrequency ?? "-"}
                    </li>
                    <li>
                      {locale === "en" ? "Recommended for" : "Empfohlen für"}:{" "}
                      {club.recommendedFor ?? "-"}
                    </li>
                    <li>
                      {locale === "en" ? "Signup notes" : "Anmeldehinweise"}:{" "}
                      {club.signupNotes ?? "-"}
                    </li>
                    <li>
                      {locale === "en" ? "Contact" : "Kontakt"}:{" "}
                      {club.contact_email ?? "-"}
                    </li>
                  </ul>
                </details>
                <button
                  type="button"
                  className={styles.joinButton}
                  disabled={alreadyMember}
                  onClick={() => void joinClub(club)}
                >
                  {alreadyMember
                    ? locale === "en" ? "✓ Joined" : "✓ Beigetreten"
                    : locale === "en" ? "Join Club" : "Club beitreten"}
                </button>
                {club.ambassadorFeedback ? (
                  <p className={styles.feedback}>{club.ambassadorFeedback}</p>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
