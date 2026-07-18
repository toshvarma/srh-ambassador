import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Grid from '@/components/Grid';
import styles from './ClubsPage.module.css';

interface Club {
  id: string;
  title: string;
  description: string;
  contact_email: string;
  logo?: {
    url: string;
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  members?: Array<{ firstName: string; lastName: string }>;
}

interface ClubsPageProps {
  currentLanguage?: string;
}

export default function ClubsPage({ currentLanguage = 'en' }: ClubsPageProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClubs();
  }, [currentLanguage]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Strapi API call
      // Filter to only show approved clubs to students
      // const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/clubs?filters[approvalStatus][$eq]=approved&locale=${currentLanguage}`);
      // const data = await response.json();
      // setClubs(data.data || []);
      
      setClubs([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    clubs: currentLanguage === 'en' ? 'Our Clubs' : 'Unsere Clubs',
    loading: currentLanguage === 'en' ? 'Loading...' : 'Wird geladen...',
    error: currentLanguage === 'en' ? 'Error loading clubs' : 'Fehler beim Laden von Clubs',
    noClubs: currentLanguage === 'en' ? 'No clubs found' : 'Keine Clubs gefunden',
    contact: currentLanguage === 'en' ? 'Contact' : 'Kontakt',
    members: currentLanguage === 'en' ? 'Members' : 'Mitglieder',
  };

  if (loading) {
    return <div className={styles.loading}>{t.loading}</div>;
  }

  if (error) {
    return <div className={styles.error}>{t.error}: {error}</div>;
  }

  return (
    <div className={styles.clubsPage}>
      <div className={styles.header}>
        <h1>{t.clubs}</h1>
        <p className={styles.subtitle}>
          {currentLanguage === 'en'
            ? 'Discover and join student clubs'
            : 'Entdecken und treten Sie Clubs bei'}
        </p>
      </div>

      {clubs.length === 0 ? (
        <div className={styles.noClubs}>{t.noClubs}</div>
      ) : (
        <Grid columns={3} gap="lg">
          {clubs.map((club) => (
            <Card
              key={club.id}
              title={club.title}
              excerpt={club.description}
              image={club.logo?.url}
              href={`/clubs/${club.id}`}
              badge={club.approvalStatus === 'approved' ? 'Active' : undefined}
              meta={[
                {
                  label: t.contact,
                  value: club.contact_email,
                },
                {
                  label: t.members,
                  value: `${club.members?.length || 0}`,
                },
              ]}
            />
          ))}
        </Grid>
      )}
    </div>
  );
}
