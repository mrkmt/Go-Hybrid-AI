import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { DbClient } from './app';

export class ActionCenterService {
    /**
     * MCP Bridge: Executes specific actions requested by the AI.
     */
    static async executeAction(action: string, params: any, pool: DbClient): Promise<any> {
        console.log(`[ActionCenter] AI is requesting action: ${action.toUpperCase()}`);

        switch (action) {
            case 'file_read':
                return this.readFile(params.path);
            case 'file_write':
                return this.writeFile(params.path, params.content);
            case 'db_query':
                return this.queryDb(params.query, params.vals, pool);
            case 'run_test':
                return this.runTest(params.filename);
            default:
                return { error: `Action ${action} not supported.` };
        }
    }

    private static async readFile(filePath: string) {
        const fullPath = path.join(process.cwd(), filePath);
        if (!fullPath.startsWith(process.cwd())) return { error: 'Access Denied' };
        return { content: fs.readFileSync(fullPath, 'utf8') };
    }

    private static async writeFile(filePath: string, content: string) {
        const fullPath = path.join(process.cwd(), filePath);
        if (!fullPath.startsWith(process.cwd())) return { error: 'Access Denied' };
        fs.writeFileSync(fullPath, content);
        return { success: true };
    }

    private static async queryDb(query: string, vals: any[], pool: DbClient) {
        // Restricted to SELECT only for AI safety
        if (!query.toLowerCase().startsWith('select')) return { error: 'Only SELECT allowed' };
        const { rows } = await pool.query(query, vals);
        return { results: rows };
    }

    private static async runTest(filename: string) {
        return new Promise((resolve) => {
            exec(`npx playwright test ${filename}`, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    output: stdout || stderr
                });
            });
        });
    }
}
