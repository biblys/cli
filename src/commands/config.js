import chalk from 'chalk';
import ssh from '../services/ssh.js';
import ConfigService from "../services/config.js";

async function configCommand(site, path, value) {
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

export default configCommand;
