import fs from 'fs/promises';
import os from 'os';

import chalk from 'chalk';
import { execa } from 'execa';
import YAML from 'yaml';

async function configCommand(site, path, value) {
  console.log(`⚙ Setting option ${chalk.yellow(path)} to ${chalk.green(value)} for site ${chalk.blue(site)}...`);

  const remoteFilePath = `biblys:~/cloud/${site}/app/config.yml`;
  const localFilePath = `${os.tmpdir()}/config.yml`;

  const config = await _readConfig(remoteFilePath, localFilePath);
  _updateConfigOptionValue(config, path, value);
  await _writeConfig(config, localFilePath, remoteFilePath);

  console.log(`✓️Config option was set to ${chalk.green(value)}.`);
}

async function _readConfig(remoteFilePath, localFilePath) {
  await execa('scp', [remoteFilePath, localFilePath]);
  const configFileContent = await fs.readFile(localFilePath, {encoding: 'utf-8'});
  return YAML.parseDocument(configFileContent);
}

function _updateConfigOptionValue(config, pathAsString, value) {
  const path = pathAsString.split('.');

  const formerValue = config.getIn(path);
  if (formerValue) {
    console.log(`ⓘ Former value for ${chalk.yellow(pathAsString)} was ${chalk.magenta(formerValue)}`);
  }

  config.setIn(path, value);
}

async function _writeConfig(config, localFilePath, remoteFilePath) {
  const updatedConfigFileContent = config.toString();
  await fs.writeFile(localFilePath, updatedConfigFileContent);
  await execa('scp', [localFilePath, remoteFilePath]);
}

export default configCommand;
