import {Site} from "../types.js";
import {readFileSync} from "fs";
import os from "os";

type Config = {
  sites: Site[]
};

export default function getCliConfig(): Config {
  const configFilePath = `${os.homedir()}/.biblys/config.json`;
  const rawConfig = readFileSync(configFilePath, 'utf-8');
  return JSON.parse(rawConfig);
}
