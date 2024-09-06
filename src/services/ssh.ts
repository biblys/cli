import {execa} from 'execa';
import {Site} from "../types.js";

export default {
  async run(command: string) {
    const {stdout} = await execa('ssh', ['biblys', command]);
    return stdout;
  },

  async runInContext(site: Site, command: string) {
    return await this.run(`cd ~/cloud/${site.name} && ${command}`);
  },

  async getCurrentSiteVersion(site: Site) {
    return await this.runInContext(site, `git describe --tags`);
  },
}
