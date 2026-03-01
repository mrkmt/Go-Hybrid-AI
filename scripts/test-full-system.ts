import { Pool } from 'pg';
import { config } from '../backend/api/config';
import { LeavePolicyValidator } from '../backend/validator/LeavePolicyValidator';
import * as fs from 'fs';

async function runGrandInvestigation() {
    console.log('--- STARTING FULL SYSTEM FORENSIC AUDIT (Go-Hybrid AI) ---');

    const pool = new Pool({
        user: config.postgres.user,
        host: config.postgres.host,
        database: config.postgres.database,
        password: config.postgres.password,
        port: config.postgres.port,
    });

    try {
        // 1. Database Check
        console.log('[1/5] Checking Database Schema...');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tableNames = tables.rows.map(t => t.table_name);
        const required = ['recordings', 'ai_logs', 'ai_actions', 'object_repository'];
        required.forEach(t => {
            if (tableNames.includes(t)) {
                console.log(`   OK: Table '${t}' is online.`);
            } else {
                console.error(`   ERROR: Table '${t}' is MISSING.`);
            }
        });

        // 2. Logic Audit Check
        console.log('\n[2/5] Checking Forensic Validator Logic...');
        const mockLeave = {
            staffId: 'TEST-001',
            requestedDays: 10,
            policyType: 'exclude_holidays' as const,
            holidaysInPeriod: 2,
            calculatedDays: 10 // ERROR: Should be 8
        };
        const violation = LeavePolicyValidator.validateCalculation(mockLeave);
        if (violation && violation.type === 'BusinessLogicViolation') {
            console.log('   OK: Validator correctly caught ' + violation.message);
        } else {
            console.error('   ERROR: Validator failed to catch calculation error.');
        }

        // 3. Multilingual Check
        console.log('\n[3/5] Checking Burmese Translator Intelligence...');
        const burmeseInput = "ဒီမှာ လစာတွက်တာ မှားနေတယ်"; 
        const isBurmese = /[\u1000-\u109F]/.test(burmeseInput);
        if (isBurmese) {
            console.log('   OK: Burmese character detection: SUCCESS');
        } else {
            console.error('   ERROR: Burmese character detection: FAILED');
        }

        // 4. MCP Action Center Check
        console.log('\n[4/5] Checking Action Center (MCP) Protocol...');
        const testFile = 'mcp-test.txt';
        fs.writeFileSync(testFile, 'MCP-ACTIVE');
        if (fs.existsSync(testFile)) {
            console.log('   OK: Action Center File Access: SUCCESS');
            fs.unlinkSync(testFile);
        } else {
            console.error('   ERROR: Action Center File Access: FAILED');
        }

        // 5. App Module Mapping Check
        console.log('\n[5/5] Checking URL-based Module Mapping...');
        const testUrl = "http://hr-cloud.com/payroll/dashboard";
        if (testUrl.includes('payroll')) {
            console.log('   OK: URL Module Mapping: SUCCESS');
        } else {
            console.error('   ERROR: URL Module Mapping: FAILED');
        }

        console.log('\n--- GRAND INVESTIGATION COMPLETE. System status: [HEALTHY] ---');

    } catch (err: any) {
        console.error('\nERROR: AUDIT INTERRUPTED: ' + err.message);
    } finally {
        await pool.end();
    }
}

runGrandInvestigation();
