import ssh from "./ssh.js";

export default class CommandExecutor
{
  constructor(private readonly command: (site: string) => {}) {
    this.command = command;
  }

  async executeForTarget(target: string) {
    if (target === "all") {
      await this.#executeForAllSites();
      return;
    }

    if (target.includes(',')) {
      const sites = target.split(',');
      await this.#executeForSomeSites(sites);
      return;
    }

    await this.#execute(target);
  }

  async #execute(site: string) {
    await this.command(site);
  }

  async #executeForSomeSites(sites: string[]) {
    for (const site of sites) {
      await this.#execute(site);
      console.log('');
    }
  }

  async #executeForAllSites() {
    const sitesList = await ssh.getSitesList();
    const sites = sitesList.split(/\r?\n/);
    await this.#executeForSomeSites(sites);
  }
}
