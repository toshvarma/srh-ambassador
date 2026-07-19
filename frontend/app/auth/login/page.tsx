"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import styles from "@/app/auth/auth.module.css";

export default function LoginPage() {
  const { login } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await login({ email, password });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.card}>
      <h1>{t(locale, "loginTitle")}</h1>
      <form className={styles.form} onSubmit={onSubmit}>
        <input type="email" placeholder={t(locale, "email")} value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input
          type="password"
          placeholder={t(locale, "password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <div className={styles.error}>{error}</div> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? t(locale, "loading") : t(locale, "login")}
        </button>
      </form>
      <p className={styles.muted}>
        {locale === "en" ? "No account yet?" : "Noch kein Konto?"} <Link href="/auth/signup">{t(locale, "signup")}</Link>
      </p>
    </section>
  );
}
