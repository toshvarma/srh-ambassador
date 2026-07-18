import React from 'react';
import styles from './Grid.module.css';

interface GridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
}

export default function Grid({ children, columns = 3, gap = 'lg' }: GridProps) {
  return (
    <div 
      className={styles.grid}
      style={{
        '--grid-columns': columns,
        '--gap': gap,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
