import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Grid from '@/components/Grid';
import styles from './NewsPage.module.css';

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  featuredImage?: {
    url: string;
  };
  publishedAt: string;
  author?: {
    firstName: string;
    lastName: string;
  };
  category?: {
    name: string;
  };
}

interface NewsPageProps {
  currentLanguage?: string;
}

export default function NewsPage({ currentLanguage = 'en' }: NewsPageProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, [currentLanguage]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Strapi API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/news?locale=${currentLanguage}`);
      // const data = await response.json();
      // setNews(data.data || []);
      
      // Mock data for now
      setNews([
        {
          id: '1',
          title: 'Welcome to SRH Ambassador',
          excerpt: 'A platform for students to connect and share ideas',
          publishedAt: new Date().toISOString(),
          author: { firstName: 'John', lastName: 'Doe' },
          category: { name: 'Announcements' },
        },
      ]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    news: currentLanguage === 'en' ? 'Latest News' : 'Neueste Nachrichten',
    loading: currentLanguage === 'en' ? 'Loading...' : 'Wird geladen...',
    error: currentLanguage === 'en' ? 'Error loading news' : 'Fehler beim Laden von Nachrichten',
    noNews: currentLanguage === 'en' ? 'No news found' : 'Keine Nachrichten gefunden',
    author: currentLanguage === 'en' ? 'Author' : 'Autor',
    published: currentLanguage === 'en' ? 'Published' : 'Veröffentlicht',
  };

  if (loading) {
    return <div className={styles.loading}>{t.loading}</div>;
  }

  if (error) {
    return <div className={styles.error}>{t.error}: {error}</div>;
  }

  return (
    <div className={styles.newsPage}>
      <div className={styles.header}>
        <h1>{t.news}</h1>
      </div>

      {news.length === 0 ? (
        <div className={styles.noNews}>{t.noNews}</div>
      ) : (
        <Grid columns={3} gap="lg">
          {news.map((article) => (
            <Card
              key={article.id}
              title={article.title}
              excerpt={article.excerpt}
              image={article.featuredImage?.url}
              href={`/news/${article.id}`}
              badge={article.category?.name}
              meta={[
                {
                  label: t.author,
                  value: article.author
                    ? `${article.author.firstName} ${article.author.lastName}`
                    : 'Unknown',
                },
                {
                  label: t.published,
                  value: new Date(article.publishedAt).toLocaleDateString(
                    currentLanguage === 'en' ? 'en-US' : 'de-DE'
                  ),
                },
              ]}
            />
          ))}
        </Grid>
      )}
    </div>
  );
}
