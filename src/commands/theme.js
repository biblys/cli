import chalk from "chalk";

import ssh from "../services/ssh.js";
import CommandExecutor from "../services/CommandExecutor.js";

export async function themeUpdateCommand(target) {
  const command = new CommandExecutor(updateThemeForSite);
  await command.executeForTarget(target);
}

async function updateThemeForSite(site) {
  console.log(`${chalk.yellow('⚙')} Pulling ${chalk.blue(site)}'s theme latest version...`);
  await ssh.runInContext(site,`composer theme:download`);

  console.log(`${chalk.yellow('⚙')} Refreshing ${chalk.blue(site)}'s theme assets...`);
  await ssh.runInContext(site,`composer theme:refresh`);

  console.log(`${chalk.green('✓')} Updated ${chalk.blue(site)}'s to latest version`);
}
