import {Site} from "../types.js";
import { getCliConfigForSite, getCliConfigForAllSites }  from "./CliConfigService.js";

export default class CommandExecutor
{
  constructor(private readonly command: (site: Site) => Promise<void>) {
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

    const site = getCliConfigForSite(target);
    if (!site) {
      return;
    }

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
    const config = getCliConfigForAllSites();
    const sites = config.sites.map(site => site.name);
    await this.#executeForSomeSites(sites);
  }
}
