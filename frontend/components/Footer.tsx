import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

interface FooterProps {
  currentLanguage?: string;
}

export default function Footer({ currentLanguage = 'en' }: FooterProps) {
  const t = {
    aboutUs: currentLanguage === 'en' ? 'About Us' : 'Über uns',
    contact: currentLanguage === 'en' ? 'Contact' : 'Kontakt',
    privacy: currentLanguage === 'en' ? 'Privacy Policy' : 'Datenschutz',
    terms: currentLanguage === 'en' ? 'Terms of Use' : 'Nutzungsbedingungen',
    copyright: currentLanguage === 'en' ? '© 2026 SRH Ambassador. All rights reserved.' : '© 2026 SRH Ambassador. Alle Rechte vorbehalten.',
    followUs: currentLanguage === 'en' ? 'Follow Us' : 'Folge uns',
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t.aboutUs}</h3>
            <p className={styles.sectionText}>
              SRH Ambassador is a platform for students to connect, share ideas, and build community.
            </p>
          </div>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t.contact}</h3>
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
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t.followUs}</h3>
            <div className={styles.socialLinks}>
              <a href="https://facebook.com/srhuniversity" className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                f
              </a>
              <a href="https://instagram.com/srhuniversity" className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                📷
              </a>
              <a href="https://linkedin.com/company/srh" className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                in
              </a>
            </div>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <div className={styles.links}>
            <Link href="/privacy" className={styles.link}>
              {t.privacy}
            </Link>
            <span className={styles.divider}>•</span>
            <Link href="/terms" className={styles.link}>
              {t.terms}
            </Link>
          </div>
          <p className={styles.copyright}>{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
