"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import styles from "@/components/Layout.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { auth, initializing } = useAuth();
  const { locale } = useLocale();
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth");

  if (!auth && !isAuthRoute) {
    return (
      <main className={styles.guestOnly}>
        <p className={styles.guestDescription}>
          {locale === "en"
            ? "SRH Ambassador is a university CMS where students, ambassadors, and faculty collaborate on clubs, events, and news."
            : "SRH Ambassador ist ein Hochschul-CMS, in dem Studierende, Botschafter und Lehrende gemeinsam Clubs, Veranstaltungen und Nachrichten verwalten."}
        </p>
        <Link href="/auth/login" className={styles.guestButton}>
          {locale === "en" ? "Sign in" : "Anmelden"}
        </Link>
      </main>
    );
  }

  if (initializing) {
    return (
      <main className={styles.guestOnly}>
        <p>{locale === "en" ? "Loading session..." : "Sitzung wird geladen..."}</p>
      </main>
    );
  }

  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>{children}</div>
      </main>
      <Footer />
    </div>
  );
}
