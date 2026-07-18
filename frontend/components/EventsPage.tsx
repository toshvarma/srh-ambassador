import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Grid from '@/components/Grid';
import styles from './EventsPage.module.css';

interface Event {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  club?: {
    title: string;
  };
}

interface EventsPageProps {
  currentLanguage?: string;
}

export default function EventsPage({ currentLanguage = 'en' }: EventsPageProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentLanguage]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Strapi API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/events?locale=${currentLanguage}`);
      // const data = await response.json();
      // setEvents(data.data || []);
      
      setEvents([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    events: currentLanguage === 'en' ? 'Upcoming Events' : 'Kommende Veranstaltungen',
    loading: currentLanguage === 'en' ? 'Loading...' : 'Wird geladen...',
    error: currentLanguage === 'en' ? 'Error loading events' : 'Fehler beim Laden von Veranstaltungen',
    noEvents: currentLanguage === 'en' ? 'No events found' : 'Keine Veranstaltungen gefunden',
    location: currentLanguage === 'en' ? 'Location' : 'Ort',
    date: currentLanguage === 'en' ? 'Date' : 'Datum',
    club: currentLanguage === 'en' ? 'Club' : 'Club',
  };

  if (loading) {
    return <div className={styles.loading}>{t.loading}</div>;
  }

  if (error) {
    return <div className={styles.error}>{t.error}: {error}</div>;
  }

  return (
    <div className={styles.eventsPage}>
      <div className={styles.header}>
        <h1>{t.events}</h1>
      </div>

      {events.length === 0 ? (
        <div className={styles.noEvents}>{t.noEvents}</div>
      ) : (
        <Grid columns={3} gap="lg">
          {events.map((event) => (
            <Card
              key={event.id}
              title={event.title}
              excerpt={event.description}
              href={`/events/${event.id}`}
              meta={[
                {
                  label: t.date,
                  value: new Date(event.start_datetime).toLocaleDateString(
                    currentLanguage === 'en' ? 'en-US' : 'de-DE'
                  ),
                },
                {
                  label: t.location,
                  value: event.location || 'TBD',
                },
                ...(event.club ? [{
                  label: t.club,
                  value: event.club.title,
                }] : []),
              ]}
            />
          ))}
        </Grid>
      )}
    </div>
  );
}
