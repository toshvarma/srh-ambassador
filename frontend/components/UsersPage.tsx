import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Grid from '@/components/Grid';
import styles from './UsersPage.module.css';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  universityAffiliation?: string;
  avatar?: {
    url: string;
  };
}

interface UsersPageProps {
  currentLanguage?: string;
}

const roleLabels: Record<string, { en: string; de: string }> = {
  Student: { en: 'Student', de: 'Student' },
  ExchangeStudent: { en: 'Exchange Student', de: 'Austauschstudent' },
  Professor: { en: 'Professor', de: 'Professor' },
  Teacher: { en: 'Teacher', de: 'Lehrer' },
  Ambassador: { en: 'Ambassador', de: 'Botschafter' },
  Admin: { en: 'Admin', de: 'Admin' },
  SuperAdmin: { en: 'Super Admin', de: 'Super Admin' },
};

export default function UsersPage({ currentLanguage = 'en' }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [currentLanguage, filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Strapi API call
      // const query = filter !== 'all' ? `&filters[role][$eq]=${filter}` : '';
      // const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users?locale=${currentLanguage}${query}`);
      // const data = await response.json();
      // setUsers(data.data || []);
      
      setUsers([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    directory: currentLanguage === 'en' ? 'Student Directory' : 'Studentenverzeichnis',
    loading: currentLanguage === 'en' ? 'Loading...' : 'Wird geladen...',
    error: currentLanguage === 'en' ? 'Error loading directory' : 'Fehler beim Laden des Verzeichnisses',
    noUsers: currentLanguage === 'en' ? 'No users found' : 'Keine Benutzer gefunden',
    role: currentLanguage === 'en' ? 'Role' : 'Rolle',
    affiliation: currentLanguage === 'en' ? 'Affiliation' : 'Zugehörigkeit',
    allRoles: currentLanguage === 'en' ? 'All Roles' : 'Alle Rollen',
    filter: currentLanguage === 'en' ? 'Filter by Role' : 'Nach Rolle filtern',
  };

  if (loading) {
    return <div className={styles.loading}>{t.loading}</div>;
  }

  if (error) {
    return <div className={styles.error}>{t.error}: {error}</div>;
  }

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  return (
    <div className={styles.usersPage}>
      <div className={styles.header}>
        <h1>{t.directory}</h1>
      </div>

      <div className={styles.filterSection}>
        <label htmlFor="roleFilter" className={styles.filterLabel}>
          {t.filter}:
        </label>
        <select
          id="roleFilter"
          className={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t.allRoles}</option>
          <option value="Student">Student</option>
          <option value="ExchangeStudent">
            {roleLabels.ExchangeStudent[currentLanguage as keyof typeof roleLabels.ExchangeStudent]}
          </option>
          <option value="Professor">Professor</option>
          <option value="Teacher">
            {roleLabels.Teacher[currentLanguage as keyof typeof roleLabels.Teacher]}
          </option>
          <option value="Ambassador">
            {roleLabels.Ambassador[currentLanguage as keyof typeof roleLabels.Ambassador]}
          </option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.noUsers}>{t.noUsers}</div>
      ) : (
        <>
          <p className={styles.resultCount}>
            {currentLanguage === 'en' ? 'Found' : 'Gefunden'} {filteredUsers.length} {currentLanguage === 'en' ? 'users' : 'Benutzer'}
          </p>
          <Grid columns={4} gap="md">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                title={`${user.firstName} ${user.lastName}`}
                excerpt={roleLabels[user.role]?.[currentLanguage as 'en' | 'de'] || user.role}
                image={user.avatar?.url}
                href={`/users/${user.id}`}
                meta={[
                  {
                    label: t.affiliation,
                    value: user.universityAffiliation || 'N/A',
                  },
                ]}
              />
            ))}
          </Grid>
        </>
      )}
    </div>
  );
}
