#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import deployCommand from './src/commands/deploy.js';
import versionCommand from './src/commands/version.js';

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
    await deployCommand(site, version);
  })
  .command('version [site]', 'display a site\'s current version', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to get version from',
        type: 'string',
      })
  }, async ({ site }) => {
    await versionCommand(site);
  })
  .parse()
