import ssh from "../services/ssh.js";
import chalk from "chalk";

async function version(site) {
  const version = await ssh.getCurrentSiteVersion(site);
  console.log(`ℹ️ Version ${chalk.yellow(version)} is deployed on site ${chalk.blue(site)}`);
}

export default version;
