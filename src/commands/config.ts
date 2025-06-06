import chalk from 'chalk';

import ConfigService from "../services/config.js";
import CommandExecutor from "../services/CommandExecutor.js";
import {Site} from "../types.js";

async function configGetCommand(target: string, path: string, bare: boolean) {
  const command = new CommandExecutor((site: Site) => _getConfigForSite(site, path, bare))
  await command.executeForTarget(target)
}

async function _getConfigForSite(site: Site, path: string, bare: boolean) {
  const config = new ConfigService(site);
  await config.open();
  const value = config.get(path);

  if (bare) {
    console.log(value);
    return;
  }

  console.log(`ⓘ Option ${chalk.yellow(path)} is set to ${chalk.green(value)} for site ${chalk.blue(site.name)}`);
}

async function configSetCommand(target: Site['name'], updates: string) {
  const command = new CommandExecutor((site: Site) => _setConfigForSite(site, updates))
  await command.executeForTarget(target)
}

async function _setConfigForSite(site: Site, updates: string) {

  const config = new ConfigService(site);
  await config.open();
  console.log(`${chalk.yellow('⚙')} Updating config for site ${chalk.blue(site.name)}…`);

  for (const update of updates) {
    const [path, value] = update.split('=');
    const formerValue = config.get(path);
    config.set(path, value);
    console.log(`  ${chalk.yellow('-')} ${chalk.yellow(path)}: ${chalk.magenta(formerValue)} => ${chalk.green(value)}`);
  }

  await config.save();
  console.log(`${chalk.green('✓')} Config for site ${chalk.blue(site.name)} was saved!`);
}

async function _delConfigForSite(site: Site, path: string) {
  const config = new ConfigService(site);
  await config.open();

  const formerValue = config.get(path);
  config.del(path);

  await config.save();

  console.log(`ⓘ Option ${chalk.yellow(path)} was deleted for site ${chalk.blue(site.name)} (was ${chalk.magenta(formerValue)})`);
}

async function configDelCommand(target: string, updates: string) {
  const command = new CommandExecutor((site: Site) => _delConfigForSite(site, updates))
  await command.executeForTarget(target)
}

export { configGetCommand, configSetCommand, configDelCommand };
