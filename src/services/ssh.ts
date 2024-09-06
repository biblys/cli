import {execa} from 'execa';
import {Site} from "../types.js";

export default {
  async run(site: Site, command: string) {
    const {stdout} = await execa('ssh', [site.server, command]);
    return stdout;
  },

  async runInContext(site: Site, command: string) {
    return await this.run(site, `cd ~/cloud/${site.name} && ${command}`);
  },

  async getCurrentSiteVersion(site: Site) {
    return await this.runInContext(site, `git describe --tags`);
  },
}
