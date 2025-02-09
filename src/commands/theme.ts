import chalk from "chalk";
import {execa} from "execa";
import {existsSync, writeFileSync} from "node:fs";

import ssh from "../services/ssh.js";
import CommandExecutor from "../services/CommandExecutor.js";
import {Site} from "../types.js";
import {getCliConfigForSite} from "../services/CliConfigService.js";
import {readFileSync} from "fs";
import os from "os";

const contextDirectory = `/Users/clement/Developer/biblys`;
const currentSiteFilePath = `${os.homedir()}/.biblys/current-site`;

export async function themeUpdateCommand(target: string) {
  const command = new CommandExecutor(updateThemeForSite);
  await command.executeForTarget(target);
}

async function updateThemeForSite(site: Site) {
  console.log(`${chalk.yellow('⚙')} Pulling ${chalk.blue(site.name)}'s theme latest version...`);
  await ssh.runInContext(site, `composer theme:download`);

  console.log(`${chalk.yellow('⚙')} Refreshing ${chalk.blue(site.name)}'s theme assets...`);
  await ssh.runInContext(site, `composer theme:refresh`);

  console.log(`${chalk.green('✓')} Updated ${chalk.blue(site.name)}'s to latest version`);
}

export async function switchThemeCommand(currentSite: string, targetSite: string) {
  if (getCliConfigForSite(currentSite) === null || getCliConfigForSite(targetSite) === null) {
    return;
  }

  console.log(
    `${chalk.yellow('⚙')} Switching local theme from ${chalk.magenta(currentSite)} to ${chalk.blue(targetSite)}...`
  );

  const devDirectory = `${contextDirectory}/biblys`;
  const appDirectory = `${devDirectory}/app`;
  const currentThemeDirectory = `${contextDirectory}/sites/${currentSite}`;
  const targetThemeDirectory = `${contextDirectory}/sites/${targetSite}`;

  if (existsSync(currentThemeDirectory)) {
    console.error(`${chalk.red('✗')} Current site is not ${chalk.magenta(currentSite)} (directory already exists).`);
    return;
  }

  if (!existsSync(targetThemeDirectory)) {
    console.error(`${chalk.red('✗')} Target directory ${chalk.magenta(currentSite)} does not exist.`);
    return;
  }

  console.log(
    `${chalk.yellow('⚙')} Moving ${chalk.magenta(currentSite)} to sites/${currentSite} directory...`
  );
  await execa("mv", [appDirectory, currentThemeDirectory], {cwd: contextDirectory});

  console.log(
    `${chalk.yellow('⚙')} Moving ${chalk.blue(targetSite)} to biblys/app directory...`
  );
  await execa("mv", [targetThemeDirectory, appDirectory], {cwd: contextDirectory});

  writeFileSync(currentSiteFilePath, targetSite, 'utf-8');

  console.log(
    `${chalk.yellow('⚙')} Refreshing ${chalk.blue(targetSite)}'s theme...`
  );
  await execa("composer", ["theme:refresh"], {cwd: devDirectory});

  console.log(`${chalk.green('✓')} Switched local theme to ${chalk.blue(targetSite)}`);
}

export async function loadThemeCommand(targetSite: string): Promise<void> {
  const currentSite = readFileSync(currentSiteFilePath, 'utf-8').trim();
  await switchThemeCommand(currentSite, targetSite);
}
