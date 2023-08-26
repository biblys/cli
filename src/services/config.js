import os from "os";
import fs from "fs/promises";

import { execa } from "execa";
import YAML from "yaml";

class ConfigService {
  constructor(site) {
    this.remoteFilePath = `biblys:~/cloud/${site}/app/config.yml`;
    this.localFilePath = `${os.tmpdir()}/config.yml`;
    this.config = undefined;
  }

  async open() {
    await execa('scp', [this.remoteFilePath, this.localFilePath]);
    const configFileContent = await fs.readFile(this.localFilePath, { encoding: 'utf-8' });
    this.config = YAML.parseDocument(configFileContent);
  }

  get(pathAsString) {
    const path = pathAsString.split('.');
    return this.config.getIn(path);
  }

  set(pathAsString, value) {
    const path = pathAsString.split('.');
    this.config.setIn(path, this._normalizeValue(value));
  }

  del(pathAsString) {
    const path = pathAsString.split('.');
    this.config.deleteIn(path);
  }

  async save() {
    const updatedConfigFileContent = this.config.toString();
    await fs.writeFile(this.localFilePath, updatedConfigFileContent);
    await execa('scp', [this.localFilePath, this.remoteFilePath]);
  }

  _normalizeValue(value) {
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
