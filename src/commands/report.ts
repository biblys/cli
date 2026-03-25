import fs from 'fs';
import path from 'path';
import os from 'os';

import chalk from 'chalk';

import ConfigService from '../services/config.js';
import { getCliConfigForAllSites } from '../services/CliConfigService.js';
import {
  getCredentials,
  saveCredentials,
  getRevenue,
  saveRevenue,
  clearRevenues,
  type Credentials,
} from '../services/SqliteService.js';
import ssh from '../services/ssh.js';
import { Site } from '../types.js';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const DB_PATH = path.join(os.homedir(), '.biblys', 'cache.db');

function formatEuros(cents: number): string {
  const euros = Math.round(cents / 100);
  return euros.toLocaleString('fr-FR') + '\u00a0€';
}

async function fetchCredentials(site: Site): Promise<Credentials> {
  const cached = getCredentials(site.name);
  if (cached) return cached;

  const config = new ConfigService(site);
  await config.open();
  const creds: Credentials = {
    host: String(config.get('db.host') ?? 'localhost'),
    port: Number(config.get('db.port') ?? 3306),
    user: String(config.get('db.user') ?? ''),
    pass: String(config.get('db.pass') ?? ''),
    baseName: String(config.get('db.base') ?? ''),
  };
  saveCredentials(site.name, creds);
  return creds;
}

async function fetchSiteRevenues(site: Site, creds: Credentials, year: number): Promise<number[]> {
  const result: number[] = new Array(12).fill(0);
  const missingMonths: number[] = [];

  for (let m = 1; m <= 12; m++) {
    const cached = getRevenue(site.name, year, m);
    if (cached !== null) {
      result[m - 1] = cached;
    } else {
      missingMonths.push(m);
    }
  }

  if (missingMonths.length === 0) {
    return result;
  }

  const monthList = missingMonths.join(', ');
  const sql =
    `SELECT MONTH(payment_executed), SUM(payment_amount) ` +
    `FROM payments ` +
    `WHERE payment_executed IS NOT NULL ` +
    `AND YEAR(payment_executed) = ${year} ` +
    `AND MONTH(payment_executed) IN (${monthList}) ` +
    `GROUP BY MONTH(payment_executed)`;

  const passArg = creds.pass ? `-p'${creds.pass}'` : '';
  const output = await ssh.run(
    site,
    `mysql -h ${creds.host} -P ${creds.port} -u ${creds.user} ${passArg} ${creds.baseName} --skip-column-names -e "${sql}" 2>/dev/null`,
  );

  const monthData = new Map<number, number>();
  for (const line of output.trim().split('\n')) {
    if (!line.trim()) continue;
    const [monthStr, amountStr] = line.split('\t');
    monthData.set(Number(monthStr), Math.round(Number(amountStr)));
  }

  for (const m of missingMonths) {
    const amount = monthData.get(m) ?? 0;
    saveRevenue(site.name, year, m, amount);
    result[m - 1] = amount;
  }

  return result;
}

function displayTable(year: number, siteNames: string[], data: Map<string, number[]>): void {
  const monthTotals: number[] = new Array(12).fill(0);
  for (const months of data.values()) {
    for (let m = 0; m < 12; m++) {
      monthTotals[m] += months[m];
    }
  }
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);

  const siteTotals = new Map<string, number>();
  for (const [name, months] of data.entries()) {
    siteTotals.set(name, months.reduce((a, b) => a + b, 0));
  }

  const siteColWidth = Math.max(...siteNames.map((n) => n.length), 'TOTAL'.length) + 2;
  const monthColWidths = MONTH_NAMES.map((name, i) => {
    const maxAmount = Math.max(
      ...Array.from(data.values()).map((months) => months[i]),
      monthTotals[i],
    );
    return Math.max(name.length, formatEuros(maxAmount).length) + 2;
  });
  const totalColWidth = Math.max(
    'TOTAL'.length,
    formatEuros(grandTotal).length,
    ...Array.from(siteTotals.values()).map((t) => formatEuros(t).length),
  ) + 2;

  const lineWidth = siteColWidth + monthColWidths.reduce((a, b) => a + b, 0) + totalColWidth;
  const separator = '─'.repeat(lineWidth);

  console.log(`\nChiffre d'affaires ${chalk.bold(String(year))}`);
  console.log(separator);

  const header =
    'Site'.padEnd(siteColWidth) +
    MONTH_NAMES.map((name, i) => name.padStart(monthColWidths[i])).join('') +
    'TOTAL'.padStart(totalColWidth);
  console.log(header);
  console.log(separator);

  for (const siteName of siteNames) {
    const months = data.get(siteName) ?? new Array(12).fill(0);
    const siteTotal = siteTotals.get(siteName) ?? 0;
    const row =
      chalk.blue(siteName) +
      ' '.repeat(siteColWidth - siteName.length) +
      months.map((m, i) => formatEuros(m).padStart(monthColWidths[i])).join('') +
      formatEuros(siteTotal).padStart(totalColWidth);
    console.log(row);
  }

  console.log(separator);
  const totalRow =
    chalk.bold('TOTAL') +
    ' '.repeat(siteColWidth - 'TOTAL'.length) +
    monthTotals.map((m, i) => formatEuros(m).padStart(monthColWidths[i])).join('') +
    formatEuros(grandTotal).padStart(totalColWidth);
  console.log(totalRow);
}

export default async function reportCommand(year: number, refresh: boolean): Promise<void> {
  if (!fs.existsSync(DB_PATH)) {
    console.error(
      `${chalk.red('✗')} Base de données non initialisée. Exécutez ${chalk.yellow('biblys setup')} d'abord.`,
    );
    process.exit(1);
  }

  if (refresh) {
    clearRevenues();
    console.log(`${chalk.yellow('⇢')} Cache revenues vidé`);
  }

  const config = getCliConfigForAllSites();
  const sites = config.sites;
  const total = sites.length;
  const data = new Map<string, number[]>();

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    process.stdout.write(`\r${chalk.yellow('⇢')} [${i + 1}/${total}] ${chalk.blue(site.name)}…`);

    try {
      const creds = await fetchCredentials(site);
      const months = await fetchSiteRevenues(site, creds, year);
      data.set(site.name, months);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stdout.write('\n');
      console.error(`${chalk.red('✗')} Erreur pour ${chalk.blue(site.name)}: ${message}`);
      data.set(site.name, new Array(12).fill(0));
    }
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  displayTable(year, sites.map((s) => s.name), data);
}
