#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import deploy from './src/commands/deploy.js';

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
    await deploy(site, version);
  })
  .parse()
