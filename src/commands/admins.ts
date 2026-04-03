import fs from 'fs';
import path from 'path';

import chalk from 'chalk';

import ConfigService from '../services/config.js';
import { getCliConfigForAllSites } from '../services/CliConfigService.js';
import ssh from '../services/ssh.js';
import { Site } from '../types.js';

type Credentials = {
  host: string;
  port: number;
  user: string;
  pass: string;
  baseName: string;
};

type CsvRow = {
  email: string;
  name: string;
  attributes: string;
};

type AdminAttributes = {
  site_name: string;
  revenue: number;
  one_percent: number;
  subscription_fee: number;
};

const TARGET_YEAR = 2025;
const OUTPUT_FILE_NAME = 'admins.csv';

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function getSubscriptionFee(revenueEuros: number): number {
  if (revenueEuros < 5000) return 20;
  if (revenueEuros <= 10000) return 35;
  if (revenueEuros <= 50000) return 50;
  if (revenueEuros <= 100000) return 75;
  return 100;
}

function toEuros(cents: number): number {
  return Math.round(cents / 100);
}

async function fetchCredentials(site: Site): Promise<Credentials> {
  const config = new ConfigService(site);
  await config.open();

  return {
    host: String(config.get('db.host') ?? 'localhost'),
    port: Number(config.get('db.port') ?? 3306),
    user: String(config.get('db.user') ?? ''),
    pass: String(config.get('db.pass') ?? ''),
    baseName: String(config.get('db.base') ?? ''),
  };
}

async function runMysqlQuery(site: Site, creds: Credentials, sql: string): Promise<string> {
  const passArg = creds.pass ? `-p'${creds.pass}'` : '';
  // Do not hide stderr: wrong column names (e.g. isAdmin vs is_admin) must surface.
  return await ssh.run(
    site,
    `mysql -h ${creds.host} -P ${creds.port} -u ${creds.user} ${passArg} ${creds.baseName} --skip-column-names -e "${sql}"`,
  );
}

/**
 * Admins: table `rights` column is `is_admin` in MySQL (Propel phpName is `isAdmin`).
 * Join `rights.user_id` → `users.id` per schema.xml.
 */
async function fetchAdminEmails(site: Site, creds: Credentials): Promise<string[]> {
  const candidateQueries = [
    `SELECT DISTINCT u.email FROM rights r INNER JOIN users u ON r.user_id = u.id WHERE r.is_admin = 1 AND r.user_id IS NOT NULL AND u.email IS NOT NULL AND u.email <> ''`,
    `SELECT DISTINCT u.email FROM rights r INNER JOIN users u ON r.user_id = u.id WHERE r.is_admin = 1 AND r.right_current = 1 AND r.user_id IS NOT NULL AND u.email IS NOT NULL AND u.email <> ''`,
  ];

  let lastError: unknown;
  for (const query of candidateQueries) {
    try {
      const output = await runMysqlQuery(site, creds, query);
      return Array.from(
        new Set(
          output
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0),
        ),
      );
    } catch (err) {
      lastError = err;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Impossible de récupérer les admins pour ${site.name}: ${detail}`);
}

async function fetchAnnualRevenueCents(site: Site, creds: Credentials, year: number): Promise<number> {
  const query =
    `SELECT COALESCE(SUM(payment_amount), 0) ` +
    `FROM payments ` +
    `WHERE payment_executed IS NOT NULL ` +
    `AND YEAR(payment_executed) = ${year}`;

  const output = await runMysqlQuery(site, creds, query);
  const value = Number(output.trim());

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}

function buildCsvLine(row: CsvRow): string {
  return [row.email, row.name, row.attributes].map(escapeCsvValue).join(',');
}

export default async function adminsCommand(): Promise<void> {
  const sites = getCliConfigForAllSites().sites;
  const rows: CsvRow[] = [];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    process.stdout.write(`\r${chalk.yellow('⇢')} [${i + 1}/${sites.length}] ${chalk.blue(site.name)}…`);

    try {
      const creds = await fetchCredentials(site);
      const adminEmails = await fetchAdminEmails(site, creds);
      const annualRevenueEuros = toEuros(await fetchAnnualRevenueCents(site, creds, TARGET_YEAR));
      const onePercent = Number(((annualRevenueEuros * 0.01) / 12).toFixed(2));
      const subscriptionFee = getSubscriptionFee(annualRevenueEuros);

      for (const email of adminEmails) {
        const attributes: AdminAttributes = {
          site_name: site.name,
          revenue: annualRevenueEuros,
          one_percent: onePercent,
          subscription_fee: subscriptionFee,
        };

        rows.push({
          email,
          name: '',
          attributes: JSON.stringify(attributes),
        });
      }
    } catch (error: unknown) {
      process.stdout.write('\n');
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${chalk.red('✗')} Erreur pour ${chalk.blue(site.name)}: ${message}`);
    }
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  const csvLines = ['email,name,attributes', ...rows.map(buildCsvLine)];
  const outputPath = path.join(process.cwd(), OUTPUT_FILE_NAME);
  fs.writeFileSync(outputPath, csvLines.join('\n') + '\n', 'utf-8');

  console.log(`${chalk.green('✓')} ${rows.length} ligne(s) exportée(s) vers ${outputPath}`);
}
