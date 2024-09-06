import os from "os";
import fs from "fs/promises";

import { execa } from "execa";
import YAML, {Document} from "yaml";
import {Site} from "../types.js";

class ConfigService {
  private readonly remoteFilePath: string;
  private readonly localFilePath: string;
  private config: Document.Parsed|undefined;

  constructor(site: Site) {
    this.remoteFilePath = `${site.server}:~/cloud/${site.name}/app/config.yml`;
    this.localFilePath = `${os.tmpdir()}/config.yml`;
  }

  async open() {
    await execa('scp', [this.remoteFilePath, this.localFilePath]);
    const configFileContent = await fs.readFile(this.localFilePath, { encoding: 'utf-8' });
    this.config = YAML.parseDocument(configFileContent);
  }

  get(pathAsString: string) {
    if (!this.config) {
      throw new Error("Config was not loaded");
    }

    const path = pathAsString.split('.');
    return this.config.getIn(path);
  }

  set(pathAsString: string, value: string) {
    if (!this.config) {
      throw new Error("Config was not loaded");
    }

    const path = pathAsString.split('.');
    this.config.setIn(path, this._normalizeValue(value));
  }

  del(pathAsString: string) {
    if (!this.config) {
      throw new Error("Config was not loaded");
    }

    const path = pathAsString.split('.');
    this.config.deleteIn(path);
  }

  async save() {
    if (!this.config) {
      throw new Error("Config was not loaded");
    }

    const updatedConfigFileContent = this.config.toString();
    await fs.writeFile(this.localFilePath, updatedConfigFileContent);
    await execa('scp', [this.localFilePath, this.remoteFilePath]);
  }

  _normalizeValue(value: string) {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return value;
  }
}

export default ConfigService;
