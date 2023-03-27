import chalk from 'chalk';
import ssh from '../services/ssh.js';
import ConfigService from "../services/config.js";

async function configGetCommand(site, path) {
  if (site === 'all') {
    await _getConfigForAllSites(path);
    return;
  }

  await _getConfigForSite(path, site);
}

async function _getConfigForSite(path, site) {
  const config = new ConfigService(site);
  await config.open();
  const value = config.get(path);

  console.log(`ⓘ Option ${chalk.yellow(path)} is set to ${chalk.green(value)} for site ${chalk.blue(site)}`);
}

async function _getConfigForAllSites(path) {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _getConfigForSite(path, site);
  }
}

async function configSetCommand(site, updates) {
  if (site === 'all') {
    await _setConfigForAllSites(updates);
    return;
  }

  await _setConfigForSite(updates, site);
}

async function _setConfigForAllSites(updates) {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _setConfigForSite(updates, site);
    console.log('');
  }
}

async function _setConfigForSite(updates, site) {

  const config = new ConfigService(site);
  await config.open();
  console.log(`${chalk.yellow('⚙')} Updating config for site ${chalk.blue(site)}…`);

  for (const update of updates) {
    const [path, value] = update.split('=');
    const formerValue = config.get(path);
    config.set(path, value);
    console.log(`  ${chalk.yellow('-')} ${chalk.yellow(path)}: ${chalk.magenta(formerValue)} => ${chalk.green(value)}`);
  }

  await config.save();
  console.log(`${chalk.green('✓')} Config for site ${chalk.blue(site)} was saved!`);
}

export { configGetCommand, configSetCommand };
