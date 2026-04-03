import ConfigService from './config.js';
import {
  getCredentials,
  saveCredentials,
  getRevenue,
  saveRevenue,
  type Credentials,
} from './SqliteService.js';
import ssh from './ssh.js';
import { Site } from '../types.js';

export async function fetchCredentials(site: Site): Promise<Credentials> {
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

export async function fetchSiteRevenues(site: Site, creds: Credentials, year: number): Promise<number[]> {
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

export async function fetchAnnualRevenue(site: Site, creds: Credentials, year: number): Promise<number> {
  const months = await fetchSiteRevenues(site, creds, year);
  return months.reduce((a, b) => a + b, 0);
}
