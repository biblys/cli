import {execa} from 'execa';

export default {
  async run(command: string) {
    const {stdout} = await execa('ssh', ['biblys', command]);
    return stdout;
  },

  async runInContext(context: string, command: string) {
    return await this.run(`cd ~/cloud/${context} && ${command}`);
  },

  async getCurrentSiteVersion(site: string) {
    return await this.runInContext(site, `git describe --tags`);
  },

  async getSitesList() {
    return await this.run('ls cloud');
  },
}
