"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { createStrapiEntry } from "@/lib/strapi";
import styles from "./ClubNewPage.module.css";

const JOOMLA_API_URL = process.env.NEXT_PUBLIC_JOOMLA_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://joomla.test";
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";
const ACCEPTED_IMAGE_EXTS = ".png,.jpg,.jpeg,.webp,.gif";

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

export default function ClubNewPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const capabilities = useCapabilities();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const en = locale === "en";

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(en ? "Only image files are accepted (PNG, JPG, WEBP, GIF)." : "Nur Bilddateien sind erlaubt (PNG, JPG, WEBP, GIF).");
      return;
    }
    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function resetForm() {
    setForm({
      title: "", shortDescription: "", detailedDescription: "",
      contact_email: auth?.profile?.email ?? "",
      meetingFrequency: "", recommendedFor: "",
      minimumMembers: "", maximumMembers: "",
      specialEquipmentRequired: "", signupNotes: "",
    });
    setCoverImageFile(null);
    setCoverImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.token || !auth.profile?.documentId) return;
    try {
      setSubmitting(true);
      setError(null);

      let coverImageUrl: string | undefined;
      if (coverImageFile) {
        coverImageUrl = await uploadImageFile(coverImageFile, auth.token);
      }

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
          cover_image: coverImageUrl,
          submittedBy: auth.profile.documentId,
          approvalStatus: "pending",
        },
        { token: auth.token, locale }
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Submission failed." : "Einreichung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!capabilities.canSubmitClubIdea) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.notice}>
            {en ? "You do not have permission to submit a club request." : "Sie haben keine Berechtigung, eine Club-Anfrage einzureichen."}
          </p>
          <Link href="/clubs" className={styles.backLink}>← {en ? "Back to Clubs" : "Zurück zu Clubs"}</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>{en ? "Request Submitted!" : "Anfrage eingereicht!"}</h1>
          <p className={styles.notice}>
            {en
              ? "Your club request has been submitted and is now under review by an ambassador. Once reviewed, you will see the decision — along with the ambassador's name and contact email — in your Profile under Club Submission Notifications."
              : "Ihre Club-Anfrage wurde eingereicht und wird von einem Ambassador geprüft. Die Entscheidung — einschließlich Name und Kontakt des Ambassadors — erscheint in Ihrem Profil unter Club-Anfragen-Benachrichtigungen."}
          </p>
          <div className={styles.successActions}>
            <button className={styles.btnSecondary} onClick={() => { setSuccess(false); resetForm(); }}>
              {en ? "Submit another" : "Weitere einreichen"}
            </button>
            <button className={styles.btnPrimary} onClick={() => router.push("/clubs")}>
              {en ? "Back to Clubs" : "Zurück zu Clubs"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/clubs" className={styles.backLink}>← {en ? "Back to Clubs" : "Zurück zu Clubs"}</Link>
        <h1 className={styles.pageTitle}>{en ? "Create Club Request" : "Club-Anfrage erstellen"}</h1>
        <p className={styles.pageSubtitle}>
          {en
            ? "Fill in the details below. Your request will be reviewed by an ambassador before being published."
            : "Füllen Sie die Details unten aus. Ihre Anfrage wird von einem Ambassador geprüft, bevor sie veröffentlicht wird."}
        </p>
      </div>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        {/* Basic Info */}
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
            <label className={styles.label}>{en ? "Detailed Description" : "Ausführliche Beschreibung"} *</label>
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

        {/* Logistics */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{en ? "Logistics" : "Logistik"}</legend>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Meeting Frequency" : "Treffenhäufigkeit"}</label>
              <input
                className={styles.input}
                value={form.meetingFrequency}
                onChange={set("meetingFrequency")}
                placeholder={en ? "e.g. Weekly (Thursday 18:00)" : "z.B. Wöchentlich (Donnerstag 18:00)"}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{en ? "Recommended For" : "Empfohlen für"}</label>
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
            <label className={styles.label}>{en ? "Special Equipment Required" : "Benötigte Ausrüstung"}</label>
            <input
              className={styles.input}
              value={form.specialEquipmentRequired}
              onChange={set("specialEquipmentRequired")}
              placeholder={en ? "e.g. Laptop, camera — or leave blank if none" : "z.B. Laptop, Kamera — oder leer lassen"}
            />
          </div>
        </fieldset>

        {/* Contact & Media */}
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
              <label className={styles.label}>{en ? "Cover Image" : "Titelbild"}</label>
              <input
                ref={fileInputRef}
                className={styles.input}
                type="file"
                accept={ACCEPTED_IMAGE_EXTS}
                onChange={handleFileChange}
              />
              {coverImagePreview && (
                <img
                  src={coverImagePreview}
                  alt="Preview"
                  style={{ marginTop: "0.5rem", maxHeight: "120px", borderRadius: "6px", objectFit: "cover" }}
                />
              )}
              <span style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem", display: "block" }}>
                {en ? "Accepted: PNG, JPG, WEBP, GIF" : "Erlaubt: PNG, JPG, WEBP, GIF"}
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{en ? "Signup Notes" : "Anmeldungshinweise"}</label>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.signupNotes}
              onChange={set("signupNotes")}
              placeholder={en ? "Any requirements or notes for people who want to join?" : "Anforderungen oder Hinweise für Beitrittswillige?"}
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
              ? (en ? "Submitting…" : "Wird eingereicht…")
              : (en ? "Submit for Review" : "Zur Prüfung einreichen")}
          </button>
        </div>
      </form>
    </div>
  );
}