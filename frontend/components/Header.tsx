"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useCapabilities } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import styles from "./Header.module.css";

export default function Header() {
  const pathname = usePathname();
  const { locale, toggleLocale } = useLocale();
  const { auth, logout } = useAuth();
  const capabilities = useCapabilities();

  const authLinks = [
    { href: "/", label: t(locale, "navHome") },
    { href: "/news", label: t(locale, "navNews") },
    { href: "/events", label: t(locale, "navEvents") },
    { href: "/clubs", label: t(locale, "navClubs") },
    { href: "/profile", label: t(locale, "profile") },
  ];
  const guestLinks = [
    { href: "/", label: t(locale, "navHome") },
    { href: "/events", label: t(locale, "navEvents") },
  ];
  const navLinks = auth ? authLinks : guestLinks;
  const canAccessManage =
    capabilities.canManageNews || capabilities.canManageEvents || capabilities.canApproveClubIdea;

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>{t(locale, "appTitle")}</span>
        </Link>

        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink} aria-current={isActive(link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
          {canAccessManage ? (
            <Link href="/manage" className={styles.navLink} aria-current={isActive("/manage") ? "page" : undefined}>
              {t(locale, "navManage")}
            </Link>
          ) : null}
        </nav>

        <div className={styles.actions}>
          <button className={styles.languageToggle} type="button" onClick={toggleLocale}>
            {locale === "en" ? t(locale, "de") : t(locale, "en")}
          </button>
          {auth ? (
            <>
              <button className={styles.loginButton} type="button" onClick={logout}>
                {t(locale, "logout")}
              </button>
            </>
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
