import chalk from 'chalk';
import ssh from '../services/ssh.js';
import ConfigService from "../services/config.js";

async function deployCommand(target, version) {
  if (target === 'all') {
    await _deployAllSites(version);
    return;
  }

  if (target.includes(',')) {
    const sites = target.split(',');
    await _deploySites(sites, version);
    return;
  }

  await _deploySite(target, version);
}

async function _deploySite(site, targetVersion) {
  const currentVersion = await ssh.getCurrentSiteVersion(site);
  if (currentVersion === targetVersion) {
    console.log(`👌 Version ${chalk.yellow(targetVersion)} is already deployed on site ${chalk.blue(site)}.`)
    return;
  }

  console.log(`${chalk.yellow('⚙')} Upgrading ${chalk.blue(site)} from ${chalk.yellow(currentVersion)} to ${chalk.yellow(targetVersion)}...`);

  console.log(`${chalk.yellow('⚙')} Enabling maintenance mode...`);
  const config = new ConfigService(site);
  await config.open();
  config.set('maintenance.enabled', true);
  config.set('maintenance.message', 'Mise à jour en cours, merci de réessayer dans quelques minutes…');
  await config.save();

  console.log(`${chalk.yellow('⚙')} Updating local repository...`);
  await ssh.runInContext(site, `git fetch`);

  console.log(`${chalk.yellow('⚙')} Installing Biblys ${chalk.yellow(targetVersion)}...`);
  await ssh.runInContext(site, `git checkout ${targetVersion}`);

  if (targetVersion === 'dev') {
    console.log(`${chalk.yellow('⚙')} Ensuring latest development version is installed...`);
    await ssh.runInContext(site, `git reset --hard origin/dev`);
  }

  console.log(`${chalk.yellow('⚙')} Installing dependencies...`);
  await ssh.runInContext(site, `composer install`);

  console.log(`${chalk.yellow('⚙')} Disabling maintenance mode...`);
  await config.open();
  config.set('maintenance.enabled', false);
  await config.save();

  console.log(`${chalk.green('✓')} Version ${chalk.yellow(targetVersion)} has been deployed on ${chalk.blue(site)}`);
}

async function _deploySites(sites, version) {
  for (const site of sites) {
    await _deploySite(site, version);
    console.log('');
  }
}

async function _deployAllSites(version) {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  await _deploySites(sites, version);
}

export default deployCommand;
