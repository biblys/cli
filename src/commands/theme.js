import ssh from "../services/ssh.js";
import chalk from "chalk";

async function themeUpdateCommand(site) {
  if (site === "all") {
    await _updateThemeForAllSites();
    return;
  }

  await _updateThemeForSite(site);
}

async function _updateThemeForSite(site) {
  console.log(`${chalk.yellow('⚙')} Pulling ${chalk.blue(site)}'s theme latest version...`);
  await ssh.runInContext(site,`composer theme:download`);

  console.log(`${chalk.yellow('⚙')} Refreshing ${chalk.blue(site)}'s theme assets...`);
  await ssh.runInContext(site,`composer theme:refresh`);

  console.log(`${chalk.green('✓')} Updated ${chalk.blue(site)}'s to latest version`);
}

async function _updateThemeForAllSites() {
  const sitesList = await ssh.getSitesList();
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _updateThemeForSite(site);
  }
}

export default themeUpdateCommand;
