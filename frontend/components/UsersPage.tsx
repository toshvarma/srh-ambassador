"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/Card";
import Grid from "@/components/Grid";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/lib/i18n";
import { fetchStrapiCollection, strapiMediaUrl, type StrapiEntry } from "@/lib/strapi";
import { roleLabels, type UserRole } from "@/lib/roles";
import styles from "./UsersPage.module.css";

type User = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  universityAffiliation?: string;
  avatar?: { url?: string } | null;
};

export default function UsersPage() {
  const { locale } = useLocale();
  const { auth } = useAuth();
  const [users, setUsers] = useState<Array<StrapiEntry<User>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStrapiCollection<User>("/users?populate=avatar", {
        token: auth?.token,
        query: filter === "all" ? undefined : { "filters[role][$eq]": filter },
      });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "unknownError"));
    } finally {
      setLoading(false);
    }
  }, [auth, filter, locale]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  if (loading) {
    return <div className={styles.loading}>{t(locale, "loading")}</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.usersPage}>
      <div className={styles.header}>
        <h1>{t(locale, "studentDirectory")}</h1>
        <p className={styles.description}>
          {locale === "en"
            ? "The Directory lists every university member — students, exchange students, professors, teachers, and ambassadors. Use it to look up roles and contact information."
            : "Das Verzeichnis enthält alle Hochschulmitglieder – Studierende, Austauschstudierende, Professoren, Lehrkräfte und Botschafter. Hier können Sie Rollen und Kontaktdaten nachschlagen."}
        </p>
      </div>

      <div className={styles.filterSection}>
        <label htmlFor="roleFilter" className={styles.filterLabel}>
          {t(locale, "filterByRole")}:
        </label>
        <select
          id="roleFilter"
          className={styles.filterSelect}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">{t(locale, "allRoles")}</option>
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label[locale]}
            </option>
          ))}
        </select>
      </div>

      {users.length === 0 ? (
        <div className={styles.noUsers}>{t(locale, "noData")}</div>
      ) : (
        <>
          <p className={styles.resultCount}>{users.length} {locale === "en" ? "members" : "Mitglieder"}</p>
          <Grid columns={4} gap="md">
            {users.map((user) => {
              const role = user.role;
              const roleLabel = role ? roleLabels[role]?.[locale] || role : "-";
              return (
                <Card
                  key={user.documentId || user.id}
                  title={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"}
                  excerpt={roleLabel}
                  image={strapiMediaUrl(user.avatar?.url)}
                  href={`/users/${user.documentId || user.id}`}
                  meta={[
                    { label: t(locale, "email"), value: user.email || "-" },
                    { label: t(locale, "role"), value: roleLabel },
                  ]}
                />
              );
            })}
          </Grid>
        </>
      )}
    </div>
  );
}
