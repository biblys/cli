import fs from 'fs';
import path from 'path';
import os from 'os';

import chalk from 'chalk';

import ssh from '../services/ssh.js';
import ConfigService from "../services/config.js";
import CommandExecutor from "../services/CommandExecutor.js";
import { getCliConfigForAllSites } from '../services/CliConfigService.js';
import { getRolloutDeployedSites, markRolloutDeployed, runMigrations } from '../services/SqliteService.js';
import { fetchAnnualRevenue, fetchCredentials } from '../services/revenue.js';
import {Site} from "../types.js";

const DB_PATH = path.join(os.homedir(), '.biblys', 'cache.db');

async function deployCommand(target: string, version: string) {
  if (target === 'next') {
    await deployNextCommand(version);
    return;
  }
  const command = new CommandExecutor((site: Site) => _deploySite(site, version))
  await command.executeForTarget(target)
}

async function deployNextCommand(targetVersion: string): Promise<void> {
  if (!fs.existsSync(DB_PATH)) {
    console.error(
      `${chalk.red('✗')} Local database not initialized. Run ${chalk.yellow('biblys setup')} first (required for revenue-based ordering).`,
    );
    process.exit(1);
  }

  runMigrations();

  const config = getCliConfigForAllSites();
  const sites = config.sites;
  const revenueYear = new Date().getFullYear() - 1;
  const deployed = new Set(getRolloutDeployedSites(targetVersion));

  type SiteWithRevenue = { site: Site; revenue: number };
  const withRevenue: SiteWithRevenue[] = [];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    process.stdout.write(`\r${chalk.yellow('⇢')} [${i + 1}/${sites.length}] ${chalk.blue(site.name)} (CA ${revenueYear})…`);
    try {
      const creds = await fetchCredentials(site);
      const revenue = await fetchAnnualRevenue(site, creds, revenueYear);
      withRevenue.push({ site, revenue });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stdout.write('\n');
      console.error(`${chalk.red('✗')} Error fetching revenue for ${chalk.blue(site.name)}: ${message}`);
      withRevenue.push({ site, revenue: 0 });
    }
  }

  process.stdout.write('\r' + ' '.repeat(72) + '\r');

  withRevenue.sort((a, b) => {
    if (a.revenue !== b.revenue) return a.revenue - b.revenue;
    return a.site.name.localeCompare(b.site.name);
  });

  const next = withRevenue.find((row) => !deployed.has(row.site.name));
  if (!next) {
    console.log(
      `${chalk.green('✓')} Progressive deploy for ${chalk.yellow(targetVersion)} is complete: all ${sites.length} site(s) are already deployed.`,
    );
    return;
  }

  const rank = deployed.size + 1;
  console.log(
    `${chalk.yellow('⚙')} Progressive deploy [${rank}/${sites.length}] — ${chalk.blue(next.site.name)} (CA ${revenueYear}: ${formatRevenueEuros(next.revenue)})`,
  );

  await _deploySite(next.site, targetVersion);
  markRolloutDeployed(targetVersion, next.site.name);
  deployed.add(next.site.name);

  const following = withRevenue.find((row) => !deployed.has(row.site.name));
  if (following) {
    console.log(
      `${chalk.yellow('⇢')} Next deploy will target ${chalk.blue(following.site.name)} (CA ${revenueYear}: ${formatRevenueEuros(following.revenue)}). Run ${chalk.yellow(`biblys deploy next ${targetVersion}`)} again.`,
    );
  } else {
    console.log(`${chalk.green('✓')} Last site deployed for ${chalk.yellow(targetVersion)}.`);
  }
}

function formatRevenueEuros(cents: number): string {
  const euros = Math.round(cents / 100);
  return euros.toLocaleString('fr-FR') + '\u00a0€';
}

async function _deploySite(site: Site, targetVersion: string) {
  const currentVersion = await ssh.getCurrentSiteVersion(site);
  if (currentVersion === targetVersion) {
    console.log(`👌 Version ${chalk.yellow(targetVersion)} is already deployed on site ${chalk.blue(site.name)}.`)
    return;
  }

  console.log(`${chalk.yellow('⚙')} Upgrading ${chalk.blue(site.name)} from ${chalk.yellow(currentVersion)} to ${chalk.yellow(targetVersion)}...`);

  console.log(`${chalk.yellow('⚙')} Enabling maintenance mode...`);
  const config = new ConfigService(site);
  await config.open();
  config.set('maintenance.enabled', "true");
  config.set('maintenance.message', 'Mise à jour en cours, merci de réessayer dans quelques minutes…');
  await config.save();

  console.log(`${chalk.yellow('⚙')} Updating local repository...`);
  await ssh.runInContext(site, `git fetch`);
  await ssh.runInContext(site, `git fetch --tags --force`);

  console.log(`${chalk.yellow('⚙')} Installing Biblys ${chalk.yellow(targetVersion)}...`);
  await ssh.runInContext(site, `git checkout ${targetVersion}`);

  if (targetVersion === 'dev') {
    console.log(`${chalk.yellow('⚙')} Ensuring latest development version is installed...`);
    await ssh.runInContext(site, `git reset --hard origin/dev`);
  }

  console.log(`${chalk.yellow('⚙')} Installing dependencies...`);
  await ssh.runInContext(site, `composer install`);

  if (site.ignoreMigrations) {
    console.log(`${chalk.yellow('⇢')} Skipping database migrations...`);
  } else {
    console.log(`${chalk.yellow('⚙')} Executing database migrations...`);
    await ssh.runInContext(site, `composer db:migrate`);
  }

  console.log(`${chalk.yellow('⚙')} Disabling maintenance mode...`);
  await config.open();
  config.set('maintenance.enabled', "false");
  await config.save();

  console.log(`${chalk.green('✓')} Version ${chalk.yellow(targetVersion)} has been deployed on ${chalk.blue(site.name)}`);
}

export default deployCommand;
