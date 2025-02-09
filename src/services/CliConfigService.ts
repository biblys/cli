import {Site} from "../types.js";
import {readFileSync} from "fs";
import os from "os";

type Config = {
  sites: Site[]
};

export function getCliConfigForSite(target: string): Site|null {
  const config = getCliConfigForAllSites()
  const site = config.sites.find(site => site.name === target);

  if (!site) {
    console.error(`Site ${target} not found`);
    return null;
  }

  return site;
}

export function getCliConfigForAllSites(): Config {
  const configFilePath = `${os.homedir()}/.biblys/config.json`;
  const rawConfig = readFileSync(configFilePath, 'utf-8');
  return JSON.parse(rawConfig);
}


