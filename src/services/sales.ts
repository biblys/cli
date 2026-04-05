import { getSale, saveSale, type Credentials } from './SqliteService.js';
import ssh from './ssh.js';
import { Site } from '../types.js';

export async function fetchSiteSales(site: Site, creds: Credentials, year: number): Promise<number[]> {
  const result: number[] = new Array(12).fill(0);
  const missingMonths: number[] = [];

  for (let m = 1; m <= 12; m++) {
    const cached = getSale(site.name, year, m);
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
    `SELECT MONTH(stock_selling_date), COUNT(*) ` +
    `FROM stock ` +
    `WHERE stock_selling_date IS NOT NULL ` +
    `AND YEAR(stock_selling_date) = ${year} ` +
    `AND MONTH(stock_selling_date) IN (${monthList}) ` +
    `GROUP BY MONTH(stock_selling_date)`;

  const passArg = creds.pass ? `-p'${creds.pass}'` : '';
  const output = await ssh.run(
    site,
    `mysql -h ${creds.host} -P ${creds.port} -u ${creds.user} ${passArg} ${creds.baseName} --skip-column-names -e "${sql}"`,
  );

  const monthData = new Map<number, number>();
  for (const line of output.trim().split('\n')) {
    if (!line.trim()) continue;
    const [monthStr, countStr] = line.split('\t');
    monthData.set(Number(monthStr), Number(countStr));
  }

  for (const m of missingMonths) {
    const quantity = monthData.get(m) ?? 0;
    saveSale(site.name, year, m, quantity);
    result[m - 1] = quantity;
  }

  return result;
}
