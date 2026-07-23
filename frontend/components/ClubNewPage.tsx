"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { createStrapiEntry } from "@/lib/strapi";
import styles from "./ClubNewPage.module.css";

const JOOMLA_API_URL = process.env.NEXT_PUBLIC_JOOMLA_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://joomla.test";
const ACCEPTED_IMAGE_EXTS = ".png,.jpg,.jpeg,.webp";

async function uploadImageToStrapi(file: File, token: string): Promise<string> {
  const body = new FormData();
  body.append("files", file, file.name);
  const res = await fetch(`${JOOMLA_API_URL}/srh-api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Upload failed (${res.status})`);
  }
  const data = await res.json() as Array<{ url?: string }>;
  const url = data[0]?.url;
  if (!url) throw new Error("No URL returned from upload.");
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`;
}

export default function ClubNewPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    detailedDescription: "",
    contact_email: auth?.profile?.email ?? "",
    meetingFrequency: "",
    recommendedFor: "",
    minimumMembers: "",
    maximumMembers: "",
    specialEquipmentRequired: "",
    signupNotes: "",
    coverImageUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.token || !auth.profile?.documentId) return;
    try {
      setSubmitting(true);
      setError(null);
      await createStrapiEntry(
        "/clubs",
        {
          title: form.title,
          shortDescription: form.shortDescription,
          detailedDescription: form.detailedDescription,
          description: form.shortDescription,
          contact_email: form.contact_email,
          meetingFrequency: form.meetingFrequency || undefined,
          recommendedFor: form.recommendedFor || undefined,
          minimumMembers: form.minimumMembers ? Number(form.minimumMembers) : undefined,
          maximumMembers: form.maximumMembers ? Number(form.maximumMembers) : undefined,
          specialEquipmentRequired: form.specialEquipmentRequired || undefined,
          signupNotes: form.signupNotes || undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          submittedBy: auth.profile.documentId,
          approvalStatus: "pending",
        },
        { token: auth.token, locale }
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : locale === "en" ? "Submission failed." : "Einreichung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  const en = locale === "en";

  if (!capabilities.canSubmitClubIdea) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.notice}>
            {en ? "You do not have permission to submit a club request." : "Sie haben keine Berechtigung, eine Club-Anfrage einzureichen."}
          </p>
          <Link href="/clubs" className={styles.backLink}>â† {en ? "Back to Clubs" : "ZurÃ¼ck zu Clubs"}</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>âœ“</div>
          <h1 className={styles.successTitle}>{en ? "Request Submitted!" : "Anfrage eingereicht!"}</h1>
          <p className={styles.notice}>
            {en
              ? "Your club request has been submitted and is now under review by an ambassador. Once reviewed, you will see the decision â€” along with the ambassador's name and contact email â€” in your Profile under Club Submission Notifications."
              : "Ihre Club-Anfrage wurde eingereicht und wird von einem Ambassador geprÃ¼ft. Die Entscheidung â€” einschlieÃŸlich Name und Kontakt des Ambassadors â€” erscheint in Ihrem Profil unter Club-Anfragen-Benachrichtigungen."}
          </p>
          <div className={styles.successActions}>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                setSuccess(false);
                setForm({ title: "", shortDescription: "", detailedDescription: "", contact_email: auth?.profile?.email ?? "", meetingFrequency: "", recommendedFor: "", minimumMembers: "", maximumMembers: "", specialEquipmentRequired: "", signupNotes: "", coverImageUrl: "" });
              }}
            >
              {en ? "Submit another" : "Weitere einreichen"}
            </button>
            <button className={styles.btnPrimary} onClick={() => router.push("/clubs")}>
              {en ? "Back to Clubs" : "ZurÃ¼ck zu Clubs"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/clubs" className={styles.backLink}>â† {en ? "Back to Clubs" : "ZurÃ¼ck zu Clubs"}</Link>
        <h1 className={styles.pageTitle}>{en ? "Create Club Request" : "Club-Anfrage erstellen"}</h1>
        <p className={styles.pageSubtitle}>
          {en
            ? "Fill in the details below. Your request will be reviewed by an ambassador before being published."
            : "FÃ¼llen Sie die Details unten aus. Ihre Anfrage wird von einem Ambassador geprÃ¼ft, bevor sie verÃ¶ffentlicht wird."}
        </p>
      </div>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        {/* â”€â”€ Basic Info â”€â”€ */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{en ? "Basic Information" : "Grundlegende Informationen"}</legend>

          <div className={styles.field}>
            <label className={styles.label}>{en ? "Club Name" : "Club-Name"} *</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={set("title")}
              placeholder={en ? "e.g. SRH Photography Club" : "z.B. SRH Fotografieclub"}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{en ? "Short Description" : "Kurzbeschreibung"} *</label>
            <input
              className={styles.input}
              value={form.shortDescription}
              onChange={set("shortDescription")}
              placeholder={en ? "One sentence summary shown on the clubs page" : "Ein-Satz-Zusammenfassung auf der Clubs-Seite"}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{en ? "Detailed Description" : "AusfÃ¼hrliche Beschreibung"} *</label>
            <textarea
              className={styles.textarea}
              rows={5}
              value={form.detailedDescription}
              onChange={set("detailedDescription")}
              placeholder={en
                ? "What is the club about? What will members do? What are the goals?"
                : "Worum geht es in dem Club? Was werden die Mitglieder tun? Was sind die Ziele?"}
              required
            />
          </div>
        </fieldset>

        {/* â”€â”€ Logistics â”€â”€ */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{en ? "Logistics" : "Logistik"}</legend>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Meeting Frequency" : "TreffenhÃ¤ufigkeit"}</label>
              <input
                className={styles.input}
                value={form.meetingFrequency}
                onChange={set("meetingFrequency")}
                placeholder={en ? "e.g. Weekly (Thursday 18:00)" : "z.B. WÃ¶chentlich (Donnerstag 18:00)"}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Recommended For" : "Empfohlen fÃ¼r"}</label>
              <input
                className={styles.input}
                value={form.recommendedFor}
                onChange={set("recommendedFor")}
                placeholder={en ? "e.g. Engineering students" : "z.B. Ingenieurstudenten"}
              />
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Min. Members" : "Min. Mitglieder"}</label>
              <input
                className={styles.input}
                type="number"
                min={1}
                value={form.minimumMembers}
                onChange={set("minimumMembers")}
                placeholder="5"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Max. Members" : "Max. Mitglieder"}</label>
              <input
                className={styles.input}
                type="number"
                min={1}
                value={form.maximumMembers}
                onChange={set("maximumMembers")}
                placeholder="50"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{en ? "Special Equipment Required" : "BenÃ¶tigte AusrÃ¼stung"}</label>
            <input
              className={styles.input}
              value={form.specialEquipmentRequired}
              onChange={set("specialEquipmentRequired")}
              placeholder={en ? "e.g. Laptop, camera â€” or leave blank if none" : "z.B. Laptop, Kamera â€“ oder leer lassen"}
            />
          </div>
        </fieldset>

        {/* â”€â”€ Contact & Media â”€â”€ */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{en ? "Contact & Media" : "Kontakt & Medien"}</legend>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Contact Email" : "Kontakt-E-Mail"} *</label>
              <input
                className={styles.input}
                type="email"
                value={form.contact_email}
                onChange={set("contact_email")}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Cover Image URL" : "Titelbild-URL"}</label>
              <input
                className={styles.input}
                type="url"
                value={form.coverImageUrl}
                onChange={set("coverImageUrl")}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{en ? "Signup Notes" : "Anmeldungshinweise"}</label>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.signupNotes}
              onChange={set("signupNotes")}
              placeholder={en ? "Any requirements or notes for people who want to join?" : "Anforderungen oder Hinweise fÃ¼r Beitrittswillige?"}
            />
          </div>
        </fieldset>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <Link href="/clubs" className={styles.btnSecondary}>
            {en ? "Cancel" : "Abbrechen"}
          </Link>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={submitting || !form.title || !form.shortDescription || !form.detailedDescription || !form.contact_email}
          >
            {submitting
              ? en ? "Submittingâ€¦" : "Wird eingereichtâ€¦"
              : en ? "Submit for Review" : "Zur PrÃ¼fung einreichen"}
          </button>
        </div>
      </form>
    </div>
  );
}
