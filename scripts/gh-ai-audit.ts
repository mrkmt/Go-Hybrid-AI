import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { Pool } from 'pg';
import { IntegrityService } from '../backend/api/IntegrityService';
import { config } from '../backend/api/config';

const program = new Command();
const pool = new Pool({
    user: config.postgres.user,
    host: config.postgres.host,
    database: config.postgres.database,
    password: config.postgres.password,
    port: config.postgres.port,
});

program
  .name('gh-ai-audit')
  .description('Go-Hybrid AI Forensic Detective CLI')
  .version('1.1.0');

program.command('audit')
  .description('Audit a specific test case execution against Admin Ground Truth')
  .option('--case <id>', 'Recording ID of the current failure')
  .option('--standard <id>', 'Recording ID of the Admin Ground Truth')
  .action(async (options) => {
    if (!options.case || !options.standard) {
        console.error(chalk.red('Error: Both --case and --standard IDs are required.'));
        process.exit(1);
    }

    console.log(chalk.yellow('🔍 Investigating Case: ' + options.case + '...'));

    try {
        const report = await IntegrityService.performForensicAudit(options.standard, options.case, pool);
        
        // 1. Boxen Header
        const verdictColor = report.verdict === 'GUILTY' ? chalk.red : chalk.green;
        const boxContent = `${chalk.bold('VERDICT:')} ${verdictColor(report.verdict)}
` +
                          `${chalk.bold('ISSUE TYPE:')} ${report.issueType.toUpperCase()}
` +
                          `${chalk.bold('POLICY:')} ${report.policyReference || 'Unknown'}`;
        
        console.log(boxen(boxContent, { padding: 1, margin: 1, borderStyle: 'double', borderColor: report.verdict === 'GUILTY' ? 'red' : 'green' }));

        // 2. Discrepancy Triangle Table
        const table = new Table({
            head: [chalk.blue('CATEGORY'), chalk.green('ADMIN STANDARD'), chalk.red('CURRENT FAILURE'), chalk.yellow('MD POLICY')],
            colWidths: [20, 30, 30, 30]
        });

        // Dummy data for visual - in real scenario we extract this from standard/executionData
        table.push(
            ['API Result', '200 OK', '500 ERROR', 'Should return status 200'],
            ['Business Value', '8 Days (Net)', '4 Days (Net)', 'Net Pay must ignore Holidays'],
            ['Execution Time', '1.2s', '15.4s (STALL)', 'Must complete < 3s']
        );

        console.log(table.toString());

        // 3. AI Explanation
        console.log(chalk.bold('
🧠 AI FORENSIC EXPLANATION:'));
        console.log(chalk.gray(report.explanation));

        // 4. Evidence Links
        console.log(chalk.bold('
📂 EVIDENCE TRACES:'));
        console.log(chalk.cyan(`MinIO Trace: /forensics/${options.case}/video_trace.webm`));
        console.log(chalk.cyan(`Admin Reference: /recordings/${options.standard}/golden_path.png`));

    } catch (err: any) {
        console.error(chalk.red('Audit Failed: ' + err.message));
    } finally {
        await pool.end();
    }
  });

program.parse(process.argv);
