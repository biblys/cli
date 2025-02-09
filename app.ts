#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import deployCommand from './src/commands/deploy.js';
import versionCommand from './src/commands/version.js';
import {configDelCommand, configGetCommand, configSetCommand} from "./src/commands/config.js";
import {loadThemeCommand, switchThemeCommand, themeUpdateCommand} from "./src/commands/theme.js";

yargs(hideBin(process.argv)).version(false)
  // @ts-ignore
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
  }, async ({ site, version }: { site: string, version: string }) => {
    await deployCommand(site, version);
  })
  // @ts-ignore
  .command('version [site]', 'display a site\'s current version', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to get version from',
        type: 'string',
      })
  }, async ({ site }: { site: string }) => {
    await versionCommand(site);
  })
  // @ts-ignore
  .command('config:get [site] [path]', 'get a config option\'s value', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to read config option for',
        type: 'string',
      })
      .positional('path', {
        describe: 'path to config option to get',
        type: 'string',
      })
      .option('bare', {
        describe: 'display raw value without message',
        type: "boolean",
        default: false,
      })
  }, async ({ site, path, bare }: { site: string, path: string, bare: boolean }) => {
    await configGetCommand(site, path, bare);
  })
  // @ts-ignore
  .command('config:set [site] [updates...]', 'set a config option\'s value', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to update config option for',
        type: 'string',
      })
      // @ts-ignore
      .positional('updates', {
        describe: 'options to updates [path]=[new value] [path]=[new value] …',
        type: 'array',
      })
  }, async ({ site, updates }: { site: string, updates: string }) => {
    await configSetCommand(site, updates);
  })
  // @ts-ignore
  .command('config:del [site] [path]', 'delete a config option', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to read config option for',
        type: 'string',
      })
      .positional('path', {
        describe: 'path to config option to delete',
        type: 'string',
      })
  }, async ({ site, path }: { site: string, path: string }) => {
    await configDelCommand(site, path);
  })
  // @ts-ignore
  .command('theme:update [site]', 'deploys a site\'s theme\' last version', (yargs) => {
    return yargs
      .positional('site', {
        describe: 'site to update themes',
        type: 'string',
      })
  }, async ({ site }: { site: string }) => {
    await themeUpdateCommand(site);
  })
  // @ts-ignore
  .command('theme:switch [current] [target]', `replaces current site's theme with another`, (yargs) => {
    return yargs
      .positional('current', {
        describe: 'current site name',
        type: 'string',
      })
      .positional('target', {
        describe: 'target site name',
        type: 'string',
      })
  }, async ({ current, target }: { current: string, target: string }) => {
    await switchThemeCommand(current, target);
  })
  // @ts-ignore
  .command('theme:load [target]', `loads target site's theme to replace current site's`, (yargs) => {
    return yargs
      .positional('target', {
        describe: 'target site name',
        type: 'string',
      })
  }, async ({ target }: { target: string }) => {
    await loadThemeCommand(target);
  })
  .parse()
