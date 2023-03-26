import chalk from 'chalk';
import ssh from '../services/ssh.js';

async function deployCommand(site, version) {
  if (site === 'all') {
    await _deployAllSites(version);
    return;
  }

  await _deploySite(site, version);
}

async function _deploySite(site, targetVersion) {
  const currentVersion = await ssh.getCurrentSiteVersion(site);
  if (currentVersion === targetVersion) {
    console.log(`👌 Version ${chalk.yellow(targetVersion)} is already deployed on site ${chalk.blue(site)}.`)
    return;
  }

  console.log('');
  console.log(`⚙ Upgrading ${chalk.blue(site)} from ${chalk.yellow(currentVersion)} to ${chalk.yellow(targetVersion)}...`);

  console.log(`⚙ Fetching latest changes from repository...`);
  await ssh.runInContext(site, `git fetch`);

  console.log(`⚙ Changing to tag ${chalk.yellow(targetVersion)}...`);
  await ssh.runInContext(site, `git checkout ${targetVersion}`);

  console.log(`⚙ Installing dependencies...`);
  await ssh.runInContext(site, `composer install`);

  console.log(`✓ Version ${chalk.yellow(targetVersion)} has been deployed on ${chalk.blue(site)}`);
  console.log('');
}

async function _deployAllSites(version) {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _deploySite(site, version);
  }
}

export default deployCommand;
