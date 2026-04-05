import fs from 'fs';
import path from 'path';
import os from 'os';

import chalk from 'chalk';

import { getCliConfigForAllSites } from '../services/CliConfigService.js';
import { clearSales } from '../services/SqliteService.js';
import { fetchCredentials } from '../services/revenue.js';
import { fetchSiteSales } from '../services/sales.js';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const DB_PATH = path.join(os.homedir(), '.biblys', 'cache.db');

function formatCount(n: number): string {
  return n.toLocaleString('fr-FR');
}

function displayAnnualTable(years: number[], siteNames: string[], data: Map<string, number[]>): void {
  const yearTotals: number[] = new Array(years.length).fill(0);
  for (const annuals of data.values()) {
    for (let y = 0; y < years.length; y++) {
      yearTotals[y] += annuals[y];
    }
  }
  const grandTotal = yearTotals.reduce((a, b) => a + b, 0);

  const siteTotals = new Map<string, number>();
  for (const [name, annuals] of data.entries()) {
    siteTotals.set(name, annuals.reduce((a, b) => a + b, 0));
  }

  const siteColWidth = Math.max(...siteNames.map((n) => n.length), 'TOTAL'.length) + 2;
  const yearColWidths = years.map((year, i) => {
    const maxAmount = Math.max(
      ...Array.from(data.values()).map((annuals) => annuals[i]),
      yearTotals[i],
    );
    return Math.max(String(year).length, formatCount(maxAmount).length) + 2;
  });
  const totalColWidth = Math.max(
    'TOTAL'.length,
    formatCount(grandTotal).length,
    ...Array.from(siteTotals.values()).map((t) => formatCount(t).length),
  ) + 2;

  const lineWidth = siteColWidth + yearColWidths.reduce((a, b) => a + b, 0) + totalColWidth;
  const separator = '─'.repeat(lineWidth);
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  console.log(`\nÉvolution des exemplaires vendus (${chalk.bold(String(firstYear))} – ${chalk.bold(String(lastYear))})`);
  console.log(separator);

  const header =
    'Site'.padEnd(siteColWidth) +
    years.map((year, i) => String(year).padStart(yearColWidths[i])).join('') +
    'TOTAL'.padStart(totalColWidth);
  console.log(header);
  console.log(separator);

  for (const siteName of siteNames) {
    const annuals = data.get(siteName) ?? new Array(years.length).fill(0);
    const siteTotal = siteTotals.get(siteName) ?? 0;
    const row =
      chalk.blue(siteName) +
      ' '.repeat(siteColWidth - siteName.length) +
      annuals.map((a, i) => formatCount(a).padStart(yearColWidths[i])).join('') +
      formatCount(siteTotal).padStart(totalColWidth);
    console.log(row);
  }

  console.log(separator);
  const totalRow =
    chalk.bold('TOTAL') +
    ' '.repeat(siteColWidth - 'TOTAL'.length) +
    yearTotals.map((a, i) => formatCount(a).padStart(yearColWidths[i])).join('') +
    formatCount(grandTotal).padStart(totalColWidth);
  console.log(totalRow);
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
    return Math.max(name.length, formatCount(maxAmount).length) + 2;
  });
  const totalColWidth = Math.max(
    'TOTAL'.length,
    formatCount(grandTotal).length,
    ...Array.from(siteTotals.values()).map((t) => formatCount(t).length),
  ) + 2;

  const lineWidth = siteColWidth + monthColWidths.reduce((a, b) => a + b, 0) + totalColWidth;
  const separator = '─'.repeat(lineWidth);

  console.log(`\nExemplaires vendus ${chalk.bold(String(year))}`);
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
      months.map((m, i) => formatCount(m).padStart(monthColWidths[i])).join('') +
      formatCount(siteTotal).padStart(totalColWidth);
    console.log(row);
  }

  console.log(separator);
  const totalRow =
    chalk.bold('TOTAL') +
    ' '.repeat(siteColWidth - 'TOTAL'.length) +
    monthTotals.map((m, i) => formatCount(m).padStart(monthColWidths[i])).join('') +
    formatCount(grandTotal).padStart(totalColWidth);
  console.log(totalRow);
}

export default async function reportSalesCommand(year: number | undefined, refresh: boolean): Promise<void> {
  if (!fs.existsSync(DB_PATH)) {
    console.error(
      `${chalk.red('✗')} Base de données non initialisée. Exécutez ${chalk.yellow('biblys setup')} d'abord.`,
    );
    process.exit(1);
  }

  if (refresh) {
    clearSales();
    console.log(`${chalk.yellow('⇢')} Cache ventes vidé`);
  }

  const config = getCliConfigForAllSites();
  const sites = config.sites;
  const total = sites.length;

  if (year === undefined) {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => currentYear - 11 + i);
    const data = new Map<string, number[]>();

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      process.stdout.write(`\r${chalk.yellow('⇢')} [${i + 1}/${total}] ${chalk.blue(site.name)}…`);

      try {
        const creds = await fetchCredentials(site);
        const annuals: number[] = [];
        for (const y of years) {
          const months = await fetchSiteSales(site, creds, y);
          annuals.push(months.reduce((a, b) => a + b, 0));
        }
        data.set(site.name, annuals);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stdout.write('\n');
        console.error(`${chalk.red('✗')} Erreur pour ${chalk.blue(site.name)}: ${message}`);
        data.set(site.name, new Array(years.length).fill(0));
      }
    }

    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    displayAnnualTable(years, sites.map((s) => s.name), data);
    return;
  }

  const data = new Map<string, number[]>();

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    process.stdout.write(`\r${chalk.yellow('⇢')} [${i + 1}/${total}] ${chalk.blue(site.name)}…`);

    try {
      const creds = await fetchCredentials(site);
      const months = await fetchSiteSales(site, creds, year);
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
