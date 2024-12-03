import chalk from 'chalk';

import ssh from '../services/ssh.js';
import ConfigService from "../services/config.js";
import CommandExecutor from "../services/CommandExecutor.js";
import {Site} from "../types.js";

async function deployCommand(target: string, version: string) {
  const command = new CommandExecutor((site: Site) => _deploySite(site, version))
  await command.executeForTarget(target)
}

async function _deploySite(site: Site, targetVersion: string) {
  const currentVersion = await ssh.getCurrentSiteVersion(site);
  if (currentVersion === targetVersion) {
    console.log(`👌 Version ${chalk.yellow(targetVersion)} is already deployed on site ${chalk.blue(site.name)}.`)
    return;
  }

  console.log(`${chalk.yellow('⚙')} Upgrading ${chalk.blue(site.name)} from ${chalk.yellow(currentVersion)} to ${chalk.yellow(targetVersion)}...`);

  console.log(`${chalk.yellow('⚙')} Enabling maintenance mode...`);
  const config = new ConfigService(site);
  await config.open();
  config.set('maintenance.enabled', "true");
  config.set('maintenance.message', 'Mise à jour en cours, merci de réessayer dans quelques minutes…');
  await config.save();

  console.log(`${chalk.yellow('⚙')} Updating local repository...`);
  await ssh.runInContext(site, `git fetch`);
  await ssh.runInContext(site, `git fetch --tags --force`);

  console.log(`${chalk.yellow('⚙')} Installing Biblys ${chalk.yellow(targetVersion)}...`);
  await ssh.runInContext(site, `git checkout ${targetVersion}`);

  if (targetVersion === 'dev') {
    console.log(`${chalk.yellow('⚙')} Ensuring latest development version is installed...`);
    await ssh.runInContext(site, `git reset --hard origin/dev`);
  }

  console.log(`${chalk.yellow('⚙')} Installing dependencies...`);
  await ssh.runInContext(site, `composer install`);

  if (!site.ignoreMigrations) {
    console.log(`${chalk.yellow('⚙')} Executing databse mgirations...`);
    await ssh.runInContext(site, `composer db:migrate`);
  }

  console.log(`${chalk.yellow('⚙')} Disabling maintenance mode...`);
  await config.open();
  config.set('maintenance.enabled', "false");
  await config.save();

  console.log(`${chalk.green('✓')} Version ${chalk.yellow(targetVersion)} has been deployed on ${chalk.blue(site.name)}`);
}

export default deployCommand;
