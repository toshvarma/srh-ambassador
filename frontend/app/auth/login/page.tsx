"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import styles from "@/app/auth/auth.module.css";

const DEMO_USERS = [
  { role: "Student", email: "student.sophia@srh.de", password: "Student1234!" },
  { role: "Exchange Student", email: "exchange.emma@srh.de", password: "Exchange1234!" },
  { role: "Professor", email: "prof.thomas@srh.de", password: "Professor1234!" },
  { role: "Teacher", email: "teacher.anna@srh.de", password: "Teacher1234!" },
  { role: "Ambassador", email: "ambassador.lars@srh.de", password: "Ambassador1234!" },
  { role: "Admin", email: "admin.klaus@srh.de", password: "Admin1234!" },
  { role: "Super Admin", email: "superadmin@srh.de", password: "SuperAdmin1234!" },
];

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

  async function loginAsDemo(emailValue: string, passwordValue: string) {
    try {
      setSubmitting(true);
      setError(null);
      setEmail(emailValue);
      setPassword(passwordValue);
      await login({ email: emailValue, password: passwordValue });
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
        <Link href="/events" className={styles.guestLink}>
          {locale === "en" ? "Continue as guest" : "Als Gast fortfahren"}
        </Link>
      </form>
      <p className={styles.muted}>
        {locale === "en" ? "No account yet?" : "Noch kein Konto?"} <Link href="/auth/signup">{t(locale, "signup")}</Link>
      </p>
      <div className={styles.demoUsers}>
        <h2>{locale === "en" ? "Quick Demo Login" : "Schneller Demo-Login"}</h2>
        <div className={styles.demoButtons}>
          {DEMO_USERS.map((demoUser) => (
            <button
              key={demoUser.email}
              type="button"
              className={styles.demoButton}
              onClick={() => void loginAsDemo(demoUser.email, demoUser.password)}
              disabled={submitting}
            >
              {demoUser.role}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
