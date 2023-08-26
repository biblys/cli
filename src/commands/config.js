import chalk from 'chalk';

import ConfigService from "../services/config.js";
import CommandExecutor from "../services/CommandExecutor.js";

async function configGetCommand(target, path) {
  const command = new CommandExecutor((site) => _getConfigForSite(site, path))
  await command.executeForTarget(target)
}

async function _getConfigForSite(site, path) {
  const config = new ConfigService(site);
  await config.open();
  const value = config.get(path);

  console.log(`ⓘ Option ${chalk.yellow(path)} is set to ${chalk.green(value)} for site ${chalk.blue(site)}`);
}

async function configSetCommand(target, updates) {
  const command = new CommandExecutor((site) => _setConfigForSite(site, updates))
  await command.executeForTarget(target)
}

async function _setConfigForSite(site, updates) {

  const config = new ConfigService(site);
  await config.open();
  console.log(`${chalk.yellow('⚙')} Updating config for site ${chalk.blue(site)}…`);

  for (const update of updates) {
    const [path, value] = update.split('=');
    const formerValue = config.get(path);
    config.set(path, value);
    console.log(`  ${chalk.yellow('-')} ${chalk.yellow(path)}: ${chalk.magenta(formerValue)} => ${chalk.green(value)}`);
  }

  await config.save();
  console.log(`${chalk.green('✓')} Config for site ${chalk.blue(site)} was saved!`);
}

async function _delConfigForSite(site, path) {
  const config = new ConfigService(site);
  await config.open();

  const formerValue = config.get(path);
  config.del(path);

  await config.save();

  console.log(`ⓘ Option ${chalk.yellow(path)} was deleted for site ${chalk.blue(site)} (was ${chalk.magenta(formerValue)})`);
}

async function configDelCommand(target, updates) {
  const command = new CommandExecutor((site) => _delConfigForSite(site, updates))
  await command.executeForTarget(target)
}

export { configGetCommand, configSetCommand, configDelCommand };
