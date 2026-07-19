"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import styles from "./Header.module.css";

export default function Header() {
  const pathname = usePathname();
  const { locale, toggleLocale } = useLocale();
  const { auth, logout } = useAuth();

  const links = [
    { href: "/", label: t(locale, "navHome") },
    { href: "/news", label: t(locale, "navNews") },
    { href: "/events", label: t(locale, "navEvents") },
    { href: "/clubs", label: t(locale, "navClubs") },
    { href: "/users", label: t(locale, "navUsers") },
    { href: "/manage", label: t(locale, "navManage") },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>{t(locale, "appTitle")}</span>
        </Link>

        <nav className={styles.nav}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink} aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <button className={styles.languageToggle} type="button" onClick={toggleLocale}>
            {locale === "en" ? t(locale, "de") : t(locale, "en")}
          </button>
          {auth ? (
            <button className={styles.loginButton} type="button" onClick={logout}>
              {t(locale, "logout")}
            </button>
          ) : (
            <Link href="/auth/login" className={styles.loginButton}>
              {t(locale, "login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
