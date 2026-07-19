"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import styles from "./Footer.module.css";

export default function Footer() {
  const { locale } = useLocale();
  const isEn = locale === "en";

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{isEn ? "About Us" : "Über uns"}</h3>
            <p className={styles.sectionText}>
              {isEn
                ? "SRH Ambassador is a platform for students to connect, share ideas, and build community."
                : "SRH Ambassador ist eine Plattform, auf der Studierende sich vernetzen, Ideen teilen und Gemeinschaft aufbauen."}
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{isEn ? "Contact" : "Kontakt"}</h3>
            <ul className={styles.list}>
              <li>
                <a href="mailto:info@srh.de" className={styles.link}>
                  info@srh.de
                </a>
              </li>
              <li>
                <a href="tel:+496221476" className={styles.link}>
                  +49 6221 476
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className={styles.bottom}>
          <div className={styles.links}>
            <Link href="/privacy" className={styles.link}>
              {isEn ? "Privacy Policy" : "Datenschutz"}
            </Link>
            <span className={styles.divider}>•</span>
            <Link href="/terms" className={styles.link}>
              {isEn ? "Terms of Use" : "Nutzungsbedingungen"}
            </Link>
          </div>
          <p className={styles.copyright}>
            {isEn ? "© 2026 SRH Ambassador. All rights reserved." : "© 2026 SRH Ambassador. Alle Rechte vorbehalten."}
          </p>
        </div>
      </div>
    </footer>
  );
}
