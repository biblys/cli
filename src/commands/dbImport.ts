import fs from 'fs';
import os from 'os';
import path from 'path';

import { execa } from 'execa';
import chalk from 'chalk';

import { getCliConfigForSite } from '../services/CliConfigService.js';
import { fetchCredentials } from '../services/revenue.js';

export default async function dbImportCommand(siteName: string): Promise<void> {
  const site = getCliConfigForSite(siteName);
  if (!site) {
    process.exit(1);
  }

  process.stdout.write(`${chalk.yellow('⇢')} Récupération des credentials pour ${chalk.blue(siteName)}…\n`);
  const creds = await fetchCredentials(site);

  const dbName = `biblys-${site.name}`;
  process.stdout.write(`${chalk.yellow('⇢')} Création de la base ${chalk.blue(dbName)}…\n`);
  await execa('mysql', ['-u', 'root', '-e', `DROP DATABASE IF EXISTS \`${dbName}\`; CREATE DATABASE \`${dbName}\``]);

  const tmpFile = path.join(os.tmpdir(), `biblys-${site.name}.sql`);

  try {
    // Étape 1 : dump via SSH
    const passArg = creds.pass ? `-p'${creds.pass}'` : '';
    const dumpCmd = `mysqldump -h ${creds.host} -P ${creds.port} -u ${creds.user} ${passArg} ${creds.baseName} 2>/dev/null`;
    const sshProc = execa('ssh', [site.server, dumpCmd]);
    const writeStream = fs.createWriteStream(tmpFile);
    let bytesReceived = 0;

    sshProc.stdout!.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      const mb = (bytesReceived / 1024 / 1024).toFixed(1);
      process.stdout.write(`\r${chalk.yellow('⇢')} [1/2] Dump de ${chalk.blue(creds.baseName)}… ${mb} Mo`);
    });

    sshProc.stdout!.pipe(writeStream);

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      }),
      sshProc,
    ]);

    process.stdout.write('\n');
    const dumpMb = (bytesReceived / 1024 / 1024).toFixed(1);
    console.log(`${chalk.green('✓')} [1/2] Dump terminé (${dumpMb} Mo)`);

    // Étape 2 : import local
    const fileSize = fs.statSync(tmpFile).size;
    const readStream = fs.createReadStream(tmpFile);
    const mysqlProc = execa('mysql', ['-u', 'root', dbName]);
    let bytesRead = 0;

    readStream.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      const pct = Math.floor((bytesRead / fileSize) * 100);
      const filled = Math.floor(pct / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      process.stdout.write(`\r${chalk.yellow('⇢')} [2/2] Import dans ${chalk.blue(dbName)}… [${bar}] ${pct}%`);
    });

    readStream.pipe(mysqlProc.stdin!);
    await mysqlProc;

    process.stdout.write('\n');
    console.log(`${chalk.green('✓')} [2/2] Import terminé`);
    console.log(`${chalk.green('✓')} Base ${chalk.blue(dbName)} importée avec succès`);

  } catch (err: unknown) {
    process.stdout.write('\n');
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${chalk.red('✗')} Erreur : ${message}`);
    process.exit(1);
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}
