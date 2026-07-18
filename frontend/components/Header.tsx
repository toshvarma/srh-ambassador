import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();
  const currentLocale = (router.query.locale as string) || 'en';
  const toggleLocale = currentLocale === 'de' ? 'en' : 'de';
  
  const t = {
    news: currentLocale === 'en' ? 'News' : 'Nachrichten',
    events: currentLocale === 'en' ? 'Events' : 'Veranstaltungen',
    clubs: currentLocale === 'en' ? 'Clubs' : 'Clubs',
    directory: currentLocale === 'en' ? 'Directory' : 'Verzeichnis',
    login: currentLocale === 'en' ? 'Login' : 'Anmelden',
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>SRH Ambassador</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link href="/news" className={styles.navLink}>
            {t.news}
          </Link>
          <Link href="/events" className={styles.navLink}>
            {t.events}
          </Link>
          <Link href="/clubs" className={styles.navLink}>
            {t.clubs}
          </Link>
          <Link href="/users" className={styles.navLink}>
            {t.directory}
          </Link>
        </nav>
        
        <div className={styles.actions}>
          <Link 
            href={{ pathname: router.pathname, query: { ...router.query, locale: toggleLocale } }}
            className={styles.languageToggle}
          >
            {toggleLocale.toUpperCase()}
          </Link>
          <Link href="/auth/login" className={styles.loginButton}>
            {t.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
