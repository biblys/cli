import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

export type Credentials = {
  host: string;
  port: number;
  user: string;
  pass: string;
  baseName: string;
};

type CredentialsRow = {
  host: string;
  port: number;
  user: string;
  pass: string;
  base_name: string;
};

type RevenueRow = {
  amount_cents: number;
};

const DB_PATH = path.join(os.homedir(), '.biblys', 'cache.db');

function openDb(): Database.Database {
  return new Database(DB_PATH);
}

export function runMigrations(): void {
  const db = openDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      site_name TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      user TEXT NOT NULL,
      pass TEXT NOT NULL,
      base_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS revenues (
      site_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      PRIMARY KEY (site_name, year, month)
    );
    CREATE TABLE IF NOT EXISTS deploy_rollout (
      target_version TEXT NOT NULL,
      site_name TEXT NOT NULL,
      PRIMARY KEY (target_version, site_name)
    );
  `);
  db.close();
}

export function getCredentials(siteName: string): Credentials | null {
  const db = openDb();
  const row = db.prepare('SELECT * FROM credentials WHERE site_name = ?').get(siteName) as CredentialsRow | undefined;
  db.close();
  if (!row) return null;
  return {
    host: row.host,
    port: row.port,
    user: row.user,
    pass: row.pass,
    baseName: row.base_name,
  };
}

export function saveCredentials(siteName: string, creds: Credentials): void {
  const db = openDb();
  db.prepare(`
    INSERT OR REPLACE INTO credentials (site_name, host, port, user, pass, base_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(siteName, creds.host, creds.port, creds.user, creds.pass, creds.baseName);
  db.close();
}

export function getRevenue(siteName: string, year: number, month: number): number | null {
  const db = openDb();
  const row = db.prepare('SELECT amount_cents FROM revenues WHERE site_name = ? AND year = ? AND month = ?').get(siteName, year, month) as RevenueRow | undefined;
  db.close();
  if (!row) return null;
  return row.amount_cents;
}

export function saveRevenue(siteName: string, year: number, month: number, amountCents: number): void {
  const db = openDb();
  db.prepare(`
    INSERT OR REPLACE INTO revenues (site_name, year, month, amount_cents)
    VALUES (?, ?, ?, ?)
  `).run(siteName, year, month, amountCents);
  db.close();
}

export function clearRevenues(): void {
  const db = openDb();
  db.prepare('DELETE FROM revenues').run();
  db.close();
}

export function getRolloutDeployedSites(targetVersion: string): string[] {
  const db = openDb();
  const rows = db
    .prepare('SELECT site_name FROM deploy_rollout WHERE target_version = ? ORDER BY site_name')
    .all(targetVersion) as { site_name: string }[];
  db.close();
  return rows.map((r) => r.site_name);
}

export function markRolloutDeployed(targetVersion: string, siteName: string): void {
  const db = openDb();
  db.prepare(`
    INSERT OR IGNORE INTO deploy_rollout (target_version, site_name)
    VALUES (?, ?)
  `).run(targetVersion, siteName);
  db.close();
}
