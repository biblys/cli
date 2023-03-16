#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execa } from 'execa';
import chalk from 'chalk';

yargs(hideBin(process.argv)).version(false)
  .command('deploy [site] [version]', 'deploy a single site', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to deploy',
        type: 'string',
      })
      .positional('version', {
        describe: 'biblys version to deploy',
        type: 'string',
      })
  }, async ({ site, version }) => {
    if (site === 'all') {
      await _deployAllSites(version);
      return;
    }

    await _deploySite(site, version);
  })
  .parse()

async function _deploySite(site, targetVersion) {
  const currentVersion = await _sshInSiteContext(site, `git describe --tags`);
  if (currentVersion === targetVersion) {
    console.log(`👌 Version ${chalk.yellow(targetVersion)} is already deployed on site ${chalk.blue(site)}.`)
    return;
  }

  console.log('');
  console.log(`⚙️ Upgrading ${chalk.blue(site)} from ${chalk.yellow(currentVersion)} to ${chalk.yellow(targetVersion)}...`);

  console.log(`☁️ Fetching latest changes from repository...`);
  await _sshInSiteContext(site, `git fetch`);

  console.log(`🏹 Changing to tag ${chalk.yellow(targetVersion)}...`);
  await _sshInSiteContext(site, `git checkout ${targetVersion}`);

  console.log(`📦 Installing dependencies...`);
  await _sshInSiteContext(site, `composer install`);

  console.log(`✅  Version ${chalk.yellow(targetVersion)} has been deployed on ${chalk.blue(site)}`);
  console.log('');
}

async function _deployAllSites(version) {
  const sitesList = await _ssh('ls cloud');
  const sites = sitesList.split(/\r?\n/);
  for (const site of sites) {
    await _deploySite(site, version);
  }
}

async function _ssh(command) {
  const { stdout } = await execa('ssh', ['biblys', command]);
  return stdout;
}

async function _sshInSiteContext(site, command) {
  return await _ssh(`cd ~/cloud/${site} && ${command}`);
}
