import chalk from "chalk";

import ssh from "../services/ssh.js";
import CommandExecutor from "../services/CommandExecutor.js";
import {execa} from "execa";

export async function themeUpdateCommand(target: string) {
  const command = new CommandExecutor(updateThemeForSite);
  await command.executeForTarget(target);
}

async function updateThemeForSite(site: string) {
  console.log(`${chalk.yellow('⚙')} Pulling ${chalk.blue(site)}'s theme latest version...`);
  await ssh.runInContext(site, `composer theme:download`);

  console.log(`${chalk.yellow('⚙')} Refreshing ${chalk.blue(site)}'s theme assets...`);
  await ssh.runInContext(site, `composer theme:refresh`);

  console.log(`${chalk.green('✓')} Updated ${chalk.blue(site)}'s to latest version`);
}

export async function switchThemeCommand(currentSite: string, targetSite: string) {
  console.log(
    `${chalk.yellow('⚙')} Switching local theme from ${chalk.magenta(currentSite)} to ${chalk.blue(targetSite)}...`
  );

  const contextDirectory = `/Users/clement/Developer/biblys`;
  const devDirectory = `${contextDirectory}/biblys`;
  const appDirectory = `${devDirectory}/app`;
  const currentThemeDirectory = `${contextDirectory}/sites/${currentSite}`;
  const targetThemeDirectory = `${contextDirectory}/sites/${targetSite}`;

  console.log(
    `${chalk.yellow('⚙')} Moving ${chalk.magenta(currentSite)} to sites/${currentSite} directory...`
  );
  await execa("mv", [appDirectory, currentThemeDirectory], {cwd: contextDirectory});

  console.log(
    `${chalk.yellow('⚙')} Moving ${chalk.blue(targetSite)} to biblys/app directory...`
  );
  await execa("mv", [targetThemeDirectory, appDirectory], {cwd: contextDirectory});

  console.log(
    `${chalk.yellow('⚙')} Refreshing ${chalk.blue(targetSite)}'s theme...`
  );
  await execa("composer", ["theme:refresh"], {cwd: devDirectory});

  console.log(`${chalk.green('✓')} Switched local theme to ${chalk.blue(targetSite)}`);
}

