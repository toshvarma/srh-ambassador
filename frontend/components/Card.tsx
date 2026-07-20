/* eslint-disable @next/next/no-img-element */
import React from 'react';
import Link from 'next/link';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  excerpt?: string;
  image?: string;
  imageAlt?: string;
  href: string;
  meta?: Array<{ label: string; value: string }>;
  badge?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export default function Card({
  title,
  excerpt,
  image,
  imageAlt,
  href,
  meta,
  badge,
  children,
  onClick,
}: CardProps) {
  const content = (
    <div className={styles.card}>
      {image && (
        <div className={styles.imageContainer}>
          <img src={image} alt={imageAlt || title} className={styles.image} />
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
      )}
      
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
        
        {meta && meta.length > 0 && (
          <div className={styles.meta}>
            {meta.map((item, index) => (
              <div key={index} className={styles.metaItem}>
                <span className={styles.metaLabel}>{item.label}:</span>
                <span className={styles.metaValue}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
        
        {children && <div className={styles.children}>{children}</div>}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button className={styles.button} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <Link href={href} className={styles.link}>{content}</Link>;
}
