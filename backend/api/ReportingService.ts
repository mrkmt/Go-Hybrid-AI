import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface ReportData {
    id: string;
    title: string;
    description: string;
    generatedAt: string;
    reportType: string;
    data: any;
    userId?: string;
}

export interface ReportFilter {
    startDate?: string;
    endDate?: string;
    reportType?: string;
    userId?: string;
}

export class ReportingService {
    private static REPORTS_DIR = path.join(process.cwd(), 'reports');
    
    constructor(private pool: any) { // Changed to 'any' to match DbClient interface
        // Ensure reports directory exists
        if (!fs.existsSync(ReportingService.REPORTS_DIR)) {
            fs.mkdirSync(ReportingService.REPORTS_DIR, { recursive: true });
        }
    }

    /**
     * Generates a comprehensive test report based on recordings and execution data.
     */
    async generateTestReport(filter: ReportFilter): Promise<ReportData> {
        const id = uuidv4();
        const reportTitle = `Test Execution Report - ${new Date().toISOString()}`;
        
        // Fetch data from database based on filters
        const queryParts = ['SELECT * FROM recordings'];
        const queryParams: any[] = [];
        let paramIndex = 1;
        
        const conditions: string[] = [];
        if (filter.startDate) {
            conditions.push(`created_at >= $${paramIndex}`);
            queryParams.push(filter.startDate);
            paramIndex++;
        }
        
        if (filter.endDate) {
            conditions.push(`created_at <= $${paramIndex}`);
            queryParams.push(filter.endDate);
            paramIndex++;
        }
        
        if (conditions.length > 0) {
            queryParts.push('WHERE', conditions.join(' AND '));
        }
        
        queryParts.push('ORDER BY created_at DESC');
        
        const result = await this.pool.query(queryParts.join(' '), queryParams);
        
        const reportData = {
            summary: {
                totalTests: result.rows.length,
                passedTests: result.rows.filter((r: any) => !this.containsError(r)).length,
                failedTests: result.rows.filter((r: any) => this.containsError(r)).length,
                dateRange: {
                    from: filter.startDate || 'Beginning of time',
                    to: filter.endDate || 'Present'
                }
            },
            testResults: result.rows.map((row: any) => ({
                id: row.id,
                sessionId: row.session_id,
                appVersion: row.app_version,
                createdAt: row.created_at,
                hasErrors: this.containsError(row),
                environment: row.environment
            }))
        };
        
        const report: ReportData = {
            id,
            title: reportTitle,
            description: 'Comprehensive test execution report with pass/fail statistics',
            generatedAt: new Date().toISOString(),
            reportType: 'test-execution',
            data: reportData,
            userId: filter.userId
        };
        
        // Save report to filesystem
        await this.saveReportToFile(report);
        
        return report;
    }

    /**
     * Generates an AI analysis report for test failures.
     */
    async generateAIAnalysisReport(recordingIds: string[]): Promise<ReportData> {
        const id = uuidv4();
        const reportTitle = `AI Analysis Report - ${new Date().toISOString()}`;
        
        // Fetch specific recordings
        const placeholders = recordingIds.map((_, i) => `$${i + 1}`).join(', ');
        const query = `SELECT * FROM recordings WHERE id IN (${placeholders})`;
        const result = await this.pool.query(query, recordingIds);
        
        // For now, we'll return basic analysis - in a real implementation, this would call AI services
        const aiAnalysis = result.rows.map((row: any) => {
            return {
                id: row.id,
                analysis: this.performBasicAnalysis(row),
                suggestions: this.generateSuggestions(row)
            };
        });
        
        const report: ReportData = {
            id,
            title: reportTitle,
            description: 'AI-powered analysis of test failures with suggestions',
            generatedAt: new Date().toISOString(),
            reportType: 'ai-analysis',
            data: {
                analyzedRecordings: aiAnalysis,
                totalRecordings: recordingIds.length
            }
        };
        
        // Save report to filesystem
        await this.saveReportToFile(report);
        
        return report;
    }

    /**
     * Saves a report to the filesystem.
     */
    private async saveReportToFile(report: ReportData): Promise<void> {
        const fileName = `${report.id}_${report.title.replace(/\s+/g, '_').substring(0, 50)}.json`;
        const filePath = path.join(ReportingService.REPORTS_DIR, fileName);
        
        await fs.promises.writeFile(filePath, JSON.stringify(report, null, 2));
    }

    /**
     * Lists all available reports.
     */
    async listReports(): Promise<ReportData[]> {
        const files = await fs.promises.readdir(ReportingService.REPORTS_DIR);
        const reports: ReportData[] = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(ReportingService.REPORTS_DIR, file);
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const report = JSON.parse(content) as ReportData;
                    reports.push(report);
                } catch (err) {
                    console.error(`Error reading report file ${file}:`, err);
                }
            }
        }
        
        return reports.sort((a, b) => 
            new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        );
    }

    /**
     * Gets a specific report by ID.
     */
    async getReportById(id: string): Promise<ReportData | null> {
        const reports = await this.listReports();
        return reports.find(report => report.id === id) || null;
    }

    /**
     * Performs basic analysis on a recording.
     */
    private performBasicAnalysis(row: any): string {
        if (this.containsError(row)) {
            return 'Test failed due to assertion error or unexpected behavior';
        }
        return 'Test passed successfully';
    }

    /**
     * Generates basic suggestions based on recording data.
     */
    private generateSuggestions(row: any): string[] {
        const suggestions: string[] = [];
        
        if (this.containsError(row)) {
            suggestions.push('Review test steps for potential race conditions');
            suggestions.push('Consider adding more explicit waits');
            suggestions.push('Verify test data integrity');
        } else {
            suggestions.push('Test executed successfully');
            suggestions.push('Consider adding more assertions for better coverage');
        }
        
        return suggestions;
    }

    /**
     * Checks if a recording contains errors.
     */
    private containsError(row: any): boolean {
        // In a real implementation, this would check for actual error indicators
        // For now, we'll just check if there are any error-related keywords in the steps
        if (!row.steps) return false;
        
        return row.steps.some((step: any) => {
            if (typeof step === 'object' && step.action) {
                return step.action.toLowerCase().includes('error') || 
                       step.action.toLowerCase().includes('fail') ||
                       (step.result && step.result.toLowerCase().includes('error'));
            }
            return false;
        });
    }
}