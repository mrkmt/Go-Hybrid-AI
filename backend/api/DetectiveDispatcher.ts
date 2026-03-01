import { AgentOrchestrator, AgentType } from './AgentOrchestrator';
import { minioService } from './MinioService';

export enum IssueType {
    HEARTBEAT = 'heartbeat',   
    POLICY_LEAVE = 'policy_leave', 
    POLICY_ATTENDANCE = 'policy_attendance', 
    POLICY_PAYROLL = 'policy_payroll', 
    VISUAL = 'visual',         
    EXTERNAL_API = 'external_api', // For Postman
    EXTERNAL_PERF = 'external_perf', // For JMeter
    UNKNOWN = 'unknown'
}

export class DetectiveDispatcher {
    /**
     * Ingests results from external tools (Postman, JMeter, Selenium)
     */
    static async ingestExternal(toolName: string, payload: any, pool: any): Promise<string> {
        console.log(`[Detective] Ingesting Foreign Intelligence from: ${toolName.toUpperCase()}`);

        const id = require('uuid').v4();
        let issueType = IssueType.UNKNOWN;

        if (toolName === 'postman') issueType = IssueType.EXTERNAL_API;
        if (toolName === 'jmeter') issueType = IssueType.EXTERNAL_PERF;

        // Save as a special 'external' recording type
        await pool.query(
            `INSERT INTO recordings (id, session_id, app_version, steps, annotations, user_id) 
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
            [id, `external_${toolName}_${Date.now()}`, 'external-v1', JSON.stringify(payload), JSON.stringify([{note: `Imported from ${toolName}`}]), 'public']
        );

        return id;
    }

    sessionId: string;
    issueType: IssueType;
    evidence: {
        manualSnapshot?: string;
        automationSnapshot?: string;
        networkLogs?: any[];
        annotations?: any[];
    };
    verdict?: string;
}

export class DetectiveDispatcher {
    /**
     * Analyzes annotations and metadata to dispatch the right skill agents.
     */
    static async analyzeAndDispatch(recording: any, autoResult: any): Promise<DetectiveReport> {
        const annotations = recording.annotations || [];
        const issueType = this.detectIssueType(annotations, recording.steps);
        
        const report: DetectiveReport = {
            sessionId: recording.session_id,
            issueType,
            evidence: {
                manualSnapshot: recording.manual_snapshot_url,
                automationSnapshot: autoResult.screenshot_url,
                networkLogs: recording.network_requests,
                annotations: annotations
            }
        };

        // Chain of Custody logic: Ensure all artifacts are linked
        console.log(`[Detective] Investigating Session: ${report.sessionId} | Type: ${issueType.toUpperCase()}`);

        // Dispatch to AI Agent for final verdict based on issue type
        const aiAnalysis = await AgentOrchestrator.executeRootCauseAnalysis(
            `Issue Type: ${issueType}. HR System Forensic Analysis required. Compare annotations against steps.`,
            recording.steps,
            annotations,
            recording.expected_results
        );

        report.verdict = aiAnalysis.response;
        return report;
    }

    private static detectIssueType(annotations: any[], steps: any[]): IssueType {
        const text = JSON.stringify(annotations).toLowerCase();
        
        // Anti-Stuck Surveillance logic: Check for long step intervals
        let hasStuckStep = false;
        for (let i = 1; i < steps.length; i++) {
            const gap = (steps[i].timestamp || 0) - (steps[i-1].timestamp || 0);
            if (gap > 10000) { // 10 seconds
                hasStuckStep = true;
                break;
            }
        }

        // Leave Domain
        if (text.includes('leave') || text.includes('holiday') || text.includes('allowance')) {
            return IssueType.POLICY_LEAVE;
        }
        // Attendance Domain
        if (text.includes('attendance') || text.includes('check-in') || text.includes('roster') || text.includes('overtime') || text.includes('ot')) {
            return IssueType.POLICY_ATTENDANCE;
        }
        // Payroll Domain
        if (text.includes('payroll') || text.includes('salary') || text.includes('deduction') || text.includes('net pay')) {
            return IssueType.POLICY_PAYROLL;
        }

        if (text.includes('color') || text.includes('button') || text.includes('missing')) {
            return IssueType.VISUAL;
        }
        if (text.includes('slow') || text.includes('stuck') || hasStuckStep) {
            return IssueType.HEARTBEAT;
        }

        return IssueType.UNKNOWN;
    }

    /**
     * Cross-Examination: API Response vs Expected Results
     */
    static crossExamine(apiResponse: any, expected: any): boolean {
        // Implementation of forensic auditing for data mismatch
        const keys = Object.keys(expected);
        for (const key of keys) {
            if (apiResponse[key] !== expected[key]) {
                return false; // Mismatch detected
            }
        }
        return true;
    }
}
