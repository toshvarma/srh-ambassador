"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { fetchStrapiCollection, strapiMediaUrl, updateStrapiEntry, type StrapiEntry } from "@/lib/strapi";
import styles from "./ManageClubReviewPage.module.css";

type Reviewer = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type ClubMember = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type ClubReview = {
  documentId?: string;
  slug?: string;
  title?: string;
  shortDescription?: string;
  detailedDescription?: string;
  contact_email?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  ambassadorFeedback?: string;
  rejectionReason?: string;
  coverImageUrl?: string;
  submittedBy?: ClubMember | null;
  reviewedBy?: Reviewer | null;
  members?: ClubMember[];
};

const STATUS_LABELS: Record<string, { en: string; de: string; color: string }> = {
  pending:  { en: "Pending Review",  de: "Ausstehend",   color: "#d97706" },
  approved: { en: "Approved",        de: "Genehmigt",    color: "#16a34a" },
  rejected: { en: "Rejected",        de: "Abgelehnt",    color: "#dc2626" },
};

export default function ManageClubReviewPage({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const permissions = useCapabilities();
  const [club, setClub] = useState<StrapiEntry<ClubReview> | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approved" | "rejected" | "pending" | null>(null);

  const loadClub = useCallback(async () => {
    if (!auth?.token) return;
    try {
      setLoading(true);
      setError(null);
      let data = await fetchStrapiCollection<ClubReview>("/clubs", {
        locale,
        token: auth.token,
        query: {
          "filters[slug][$eq]": slug,
          "populate[0]": "submittedBy",
          "populate[1]": "members",
          "populate[2]": "reviewedBy",
        },
      });
      if (!data[0]) {
        data = await fetchStrapiCollection<ClubReview>("/clubs", {
          locale,
          token: auth.token,
          query: {
            "filters[documentId][$eq]": slug,
            "populate[0]": "submittedBy",
            "populate[1]": "members",
            "populate[2]": "reviewedBy",
          },
        });
      }
      const selected = data[0] ?? null;
      setClub(selected);
      setFeedback(selected?.ambassadorFeedback ?? "");
      setRejectionReason(selected?.rejectionReason ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, locale, slug]);

  useEffect(() => {
    void loadClub();
  }, [loadClub]);

  async function updateStatus(nextStatus: "approved" | "rejected" | "pending") {
    if (!club?.documentId || !auth?.token || !auth.profile?.documentId || !permissions.canApproveClubIdea) return;

    if (nextStatus === "rejected" && !rejectionReason.trim()) {
      setError(
        locale === "en"
          ? "A rejection reason is required before rejecting a club."
          : "Bitte einen Ablehnungsgrund angeben."
      );
      return;
    }
    if (nextStatus === "pending" && !feedback.trim()) {
      setError(
        locale === "en"
          ? "Please add feedback before suggesting changes."
          : "Bitte Feedback vor Änderungsvorschlägen eingeben."
      );
      return;
    }

    // Show confirmation dialog — actual save happens in confirmDecision()
    setConfirmAction(nextStatus);
    setError(null);
  }

  async function confirmDecision() {
    if (!confirmAction || !club?.documentId || !auth?.token || !auth.profile?.documentId) return;
    const nextStatus = confirmAction;
    setConfirmAction(null);
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await updateStrapiEntry(
        `/clubs/${club.documentId}`,
        {
          approvalStatus: nextStatus,
          ambassadorFeedback: feedback.trim() || null,
          rejectionReason: nextStatus === "rejected" ? rejectionReason.trim() : null,
          reviewedBy: auth.profile.documentId,
        },
        { token: auth.token, locale }
      );
      await loadClub();
      const msgs = {
        approved: { en: "Club approved ✓", de: "Club genehmigt ✓" },
        rejected: { en: "Club rejected.",  de: "Club abgelehnt." },
        pending:  { en: "Feedback sent.",  de: "Feedback gesendet." },
      };
      setMessage(msgs[nextStatus][locale]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSaving(false);
    }
  }

  if (!auth || !permissions.canApproveClubIdea) {
    return (
      <section className={styles.page}>
        <h1>{locale === "en" ? "Review Club" : "Club prüfen"}</h1>
        <p className={styles.notice}>
          {locale === "en"
            ? "You do not have access to this review page."
            : "Sie haben keinen Zugriff auf diese Prüfseite."}
        </p>
      </section>
    );
  }

  if (loading) return <div className={styles.loading}>{t(locale, "loading")}</div>;
  if (!club) return <div className={styles.error}>{locale === "en" ? "Club not found." : "Club nicht gefunden."}</div>;

  const submitter = `${club.submittedBy?.firstName ?? ""} ${club.submittedBy?.lastName ?? ""}`.trim();
  const submitterEmail = club.submittedBy?.email ?? "";
  const reviewer = club.reviewedBy
    ? `${club.reviewedBy.firstName ?? ""} ${club.reviewedBy.lastName ?? ""}`.trim()
    : null;
  const statusInfo = STATUS_LABELS[club.approvalStatus ?? "pending"] ?? STATUS_LABELS.pending;
  const en = locale === "en";

  // A final decision means the club is no longer in a reviewable state
  const decisionMade = club.approvalStatus === "approved" || club.approvalStatus === "rejected";

  // Confirm dialog labels
  const confirmLabels: Record<string, { title: string; body: string; cta: string }> = {
    approved: {
      title: en ? "Approve this club?" : "Diesen Club genehmigen?",
      body:   en ? "This will approve the club and notify the submitter." : "Dadurch wird der Club genehmigt und der Einreicher benachrichtigt.",
      cta:    en ? "Yes, approve" : "Ja, genehmigen",
    },
    rejected: {
      title: en ? "Reject this club?" : "Diesen Club ablehnen?",
      body:   en ? "This will reject the club and send the rejection reason to the submitter." : "Dadurch wird der Club abgelehnt und der Ablehnungsgrund an den Einreicher gesendet.",
      cta:    en ? "Yes, reject" : "Ja, ablehnen",
    },
    pending: {
      title: en ? "Send feedback?" : "Feedback senden?",
      body:   en ? "This will send your feedback to the submitter. The club will stay in pending state." : "Dadurch wird Ihr Feedback an den Einreicher gesendet. Der Club bleibt im ausstehenden Zustand.",
      cta:    en ? "Yes, send feedback" : "Ja, Feedback senden",
    },
  };

  return (
    <article className={styles.page}>
      {/* ── Confirm dialog ── */}
      {confirmAction ? (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>{confirmLabels[confirmAction].title}</h3>
            <p className={styles.dialogBody}>{confirmLabels[confirmAction].body}</p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.dialogCancel}
                onClick={() => setConfirmAction(null)}
              >
                {en ? "Cancel" : "Abbrechen"}
              </button>
              <button
                type="button"
                className={confirmAction === "approved" ? styles.successAction : confirmAction === "rejected" ? styles.rejectAction : styles.secondaryAction}
                onClick={() => void confirmDecision()}
              >
                {confirmLabels[confirmAction].cta}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Link href="/manage" className={styles.backLink}>
        {en ? "← Back to Manage" : "← Zurück zu Verwaltung"}
      </Link>

      <header className={styles.clubHeader}>
        <h1>{club.title}</h1>
        <span className={styles.statusBadge} style={{ background: statusInfo.color }}>
          {statusInfo[locale]}
        </span>
      </header>

      {club.coverImageUrl ? (
        <img src={strapiMediaUrl(club.coverImageUrl) ?? club.coverImageUrl} alt={club.title ?? "Club"} className={styles.cover} />
      ) : null}

      {/* ── Club details ── */}
      <section className={styles.card}>
        <h2>{en ? "Club Overview" : "Club-Überblick"}</h2>
        <p>{club.shortDescription}</p>
        <p>{club.detailedDescription}</p>
        <dl className={styles.meta}>
          <dt>{en ? "Contact" : "Kontakt"}</dt>
          <dd>{club.contact_email ?? "-"}</dd>
          <dt>{en ? "Submitted by" : "Eingereicht von"}</dt>
          <dd>
            {submitter || "-"}
            {submitterEmail ? <> · <a href={`mailto:${submitterEmail}`}>{submitterEmail}</a></> : null}
          </dd>
          <dt>{en ? "Members" : "Mitglieder"}</dt>
          <dd>{(club.members ?? []).length}</dd>
          {reviewer ? (
            <>
              <dt>{en ? "Previously reviewed by" : "Bisher geprüft von"}</dt>
              <dd>
                {reviewer}
                {club.reviewedBy?.email ? <> · <a href={`mailto:${club.reviewedBy.email}`}>{club.reviewedBy.email}</a></> : null}
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      {/* ── Existing decision info ── */}
      {(club.rejectionReason || club.ambassadorFeedback) ? (
        <section className={styles.card}>
          <h2>{en ? "Decision on Record" : "Gespeicherte Entscheidung"}</h2>
          {club.rejectionReason ? (
            <div className={styles.decisionBlock}>
              <strong>{en ? "Rejection reason:" : "Ablehnungsgrund:"}</strong>
              <p>{club.rejectionReason}</p>
            </div>
          ) : null}
          {club.ambassadorFeedback ? (
            <div className={styles.decisionBlock}>
              <strong>{en ? "Feedback:" : "Feedback:"}</strong>
              <p>{club.ambassadorFeedback}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Moderation panel — only shown while still pending ── */}
      {decisionMade ? (
        <section className={styles.decisionLockedCard}>
          <span className={styles.decisionLockedIcon}>
            {club.approvalStatus === "approved" ? "✓" : "✕"}
          </span>
          <div>
            <strong>
              {club.approvalStatus === "approved"
                ? (en ? "This club has been approved." : "Dieser Club wurde genehmigt.")
                : (en ? "This club has been rejected." : "Dieser Club wurde abgelehnt.")}
            </strong>
            <p>
              {en
                ? "No further action is needed. The decision has been recorded and the submitter has been notified."
                : "Es sind keine weiteren Maßnahmen erforderlich. Die Entscheidung wurde gespeichert und der Einreicher wurde benachrichtigt."}
            </p>
          </div>
        </section>
      ) : (
        <section className={styles.card}>
          <h2>{en ? "Make a Decision" : "Entscheidung treffen"}</h2>
          <p className={styles.helpText}>
            {en
              ? "You are acting as the reviewing ambassador. Your name and email will be shared with the student."
              : "Sie handeln als prüfender Ambassador. Ihr Name und Ihre E-Mail werden dem Studenten mitgeteilt."}
          </p>

          <label className={styles.fieldLabel}>
            {en ? "Rejection reason" : "Ablehnungsgrund"}
            <span className={styles.required}> *{en ? " (required when rejecting)" : " (bei Ablehnung erforderlich)"}</span>
          </label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder={
              en
                ? "Explain why this club cannot be approved in its current form…"
                : "Erklären Sie, warum dieser Club in der aktuellen Form nicht genehmigt werden kann…"
            }
          />

          <label className={styles.fieldLabel}>
            {en ? "Feedback / suggested changes" : "Feedback / Änderungsvorschläge"}
            <span className={styles.optional}> ({en ? "optional, shown to student" : "optional, für Studenten sichtbar"})</span>
          </label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder={
              en
                ? "Any constructive comments or suggestions for improvement…"
                : "Konstruktive Kommentare oder Verbesserungsvorschläge…"
            }
          />

          <div className={styles.actions}>
            <button type="button" className={styles.successAction} disabled={saving} onClick={() => void updateStatus("approved")}>
              {en ? "✓ Approve Club" : "✓ Club genehmigen"}
            </button>
            <button type="button" className={styles.rejectAction} disabled={saving} onClick={() => void updateStatus("rejected")}>
              {en ? "✕ Reject Club" : "✕ Club ablehnen"}
            </button>
            <button type="button" className={styles.secondaryAction} disabled={saving} onClick={() => void updateStatus("pending")}>
              {en ? "↩ Send Feedback" : "↩ Feedback senden"}
            </button>
          </div>
        </section>
      )}

      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </article>
  );
}
