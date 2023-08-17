import ssh from "../services/ssh.js";
import chalk from "chalk";

async function versionCommand(target) {
  if (target === "all") {
    await _executeCommandForAllSites(_displaySiteVersion);
    return;
  }

  if (target.includes(',')) {
    const sites = target.split(',');
    await _executeCommandForSomeSites(_displaySiteVersion, sites);
    return;
  }

  await _displaySiteVersion(target);
}

async function _displaySiteVersion(site) {
  const version = await ssh.getCurrentSiteVersion(site);
  console.log(`ⓘ️ Version ${chalk.yellow(version)} is deployed on site ${chalk.blue(site)}`);
}

async function _executeCommandForAllSites(command) {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  await _executeCommandForSomeSites(command, sites);
}

async function _executeCommandForSomeSites(command, sites) {
  for (const site of sites) {
    await command(site);
  }
}

export default versionCommand;
