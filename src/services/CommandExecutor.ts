import ssh from "./ssh.js";
import {Site} from "../types.js";

export default class CommandExecutor
{
  constructor(private readonly command: (site: Site) => {}) {
    this.command = command;
  }

  async executeForTarget(target: Site['name']) {
    if (target === "all") {
      await this.#executeForAllSites();
      return;
    }

    if (target.includes(',')) {
      const sites = target.split(',');
      await this.#executeForSomeSites(sites);
      return;
    }

    const site: Site = { name: target };

    await this.#execute(site);
  }

  async #execute(site: Site) {
    await this.command(site);
  }

  async #executeForSomeSites(sites: string[]) {
    for (const site of sites) {
      await this.executeForTarget(site);
      console.log('');
    }
  }

  async #executeForAllSites() {
    const sitesList = await ssh.getSitesList();
    const sites = sitesList.split(/\r?\n/);
    await this.#executeForSomeSites(sites);
  }
}
