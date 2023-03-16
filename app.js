#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execa } from 'execa';

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
    await _deploySite(site, version);
  })
  .parse()

async function _deploySite(site, version) {
  if (site === 'all') {
    await _deployAllSites(version);
    return;
  }

  const { stdout } = await execa('./scripts/deploy', [site, version]);
  console.log(stdout);
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
