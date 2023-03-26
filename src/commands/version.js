import ssh from "../services/ssh.js";
import chalk from "chalk";

async function versionCommand(site) {
  if (site === "all") {
    await _displayAllSitesVersion();
    return;
  }

  await _displaySiteVersion(site);
}

async function _displaySiteVersion(site) {
  const version = await ssh.getCurrentSiteVersion(site);
  console.log(`ℹ️ Version ${chalk.yellow(version)} is deployed on site ${chalk.blue(site)}`);
}

async function _displayAllSitesVersion() {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _displaySiteVersion(site);
  }
}

export default versionCommand;
