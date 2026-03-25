import chalk from 'chalk';
import { runMigrations } from '../services/SqliteService.js';

export default async function setupCommand(): Promise<void> {
  runMigrations();
  console.log(`${chalk.green('✓')} Base de données initialisée`);
}
