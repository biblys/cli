import chalk from "chalk";

import ssh from "../services/ssh.js";
import CommandExecutor from "../services/CommandExecutor.js";

async function versionCommand(target) {
  const command = new CommandExecutor(displaySiteVersion);
  await command.executeForTarget(target);
}

async function displaySiteVersion(site) {
  const version = await ssh.getCurrentSiteVersion(site);
  console.log(`ⓘ️ Version ${chalk.yellow(version)} is deployed on site ${chalk.blue(site)}`);
}

export default versionCommand;
