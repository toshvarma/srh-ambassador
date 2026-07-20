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
  const isEventsRoute = pathname?.startsWith("/events");
  const isHomeRoute = pathname === "/";

  if (initializing) {
    return (
      <main className={styles.guestOnly}>
        <p>{locale === "en" ? "Loading session..." : "Sitzung wird geladen..."}</p>
      </main>
    );
  }

  if (!auth && !isAuthRoute && !isEventsRoute && !isHomeRoute) {
    return (
      <main className={styles.guestOnly}>
        <p className={styles.guestDescription}>
          {locale === "en"
            ? "This page requires sign in. Guests can access Home and Events."
            : "Diese Seite erfordert eine Anmeldung. Gäste können Start und Events aufrufen."}
        </p>
        <Link href="/auth/login" className={styles.guestButton}>
          {locale === "en" ? "Sign in" : "Anmelden"}
        </Link>
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
