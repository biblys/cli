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

async function configSetCommand(site, path, value) {
  if (site === 'all') {
    await _setConfigForAllSites(path, value);
    return;
  }

  await _setConfigForSite(path, value, site);
}

async function _setConfigForAllSites(path, value) {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _setConfigForSite(path, value, site);
    console.log('');
  }
}

async function _setConfigForSite(path, value, site) {
  console.log(`⚙ Setting option ${chalk.yellow(path)} to ${chalk.green(value)} for site ${chalk.blue(site)}...`);

  const config = new ConfigService(site);
  await config.open();

  const formerValue = config.get(path);
  if (formerValue) {
    console.log(`ⓘ Former value for ${chalk.yellow(path)} was ${chalk.magenta(formerValue)}`);
  }

  config.set(path, value);
  await config.save();

  console.log(`✓ Config option was set to ${chalk.green(value)}.`);
}

export { configGetCommand, configSetCommand };
