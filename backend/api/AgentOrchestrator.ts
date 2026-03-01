import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { ContextManager } from './ContextManager';
import { config } from './config';
import { CloudAIService } from './CloudAIService';
import { BurmeseTranslator } from './BurmeseTranslator';

export interface AgentResult {
    response: string; // Summarized Anomaly (Local AI)
    cloudVerdict?: string; // Human-readable final verdict (Cloud AI)
    modelUsed: string;
    status: 'success' | 'fallback' | 'error';
    agent?: string;
    fromCache?: boolean;
}

export interface MultiAgentTask {
    task: string;
    context: any;
    agents: AgentType[];
}

export enum AgentType {
    ARCHITECT = 'architect',
    CODER = 'coder',
    REVIEWER = 'reviewer',
    ANALYST = 'analyst'
}

export interface AgentProfile {
    name: AgentType;
    role: string;
    model: string;
    promptPrefix: string;
}

export class AgentOrchestrator {
    private static PRIMARY_MODEL = config.ai.defaultModel;
    private static FALLBACK_MODEL = config.ai.fallbackModel;
    private static OLLAMA_URL = config.ai.ollamaGenerateUrl;

    private static LOG_FILE = path.join(__dirname, '../../debug_orchestrator.log');

    static log(msg: string) {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        try {
            fs.appendFileSync(this.LOG_FILE, line);
        } catch (e) {
            // ignore fs errors
        }
        console.log(msg);
    }

    static init() {
        this.log(`[Orchestrator] Configured with PRIMARY_MODEL=${this.PRIMARY_MODEL}, URL=${this.OLLAMA_URL}`);
    }

    // Define agent profiles for multi-agent collaboration
    private static AGENT_PROFILES: AgentProfile[] = [
        {
            name: AgentType.ARCHITECT,
            role: "Test Architect - designs test structure and identifies key elements",
            model: config.ai.defaultModel,
            promptPrefix: "As a senior test architect, analyze the test requirements and create a comprehensive test plan."
        },
        {
            name: AgentType.CODER,
            role: "Test Developer - implements the actual test code based on the plan",
            model: config.ai.defaultModel,
            promptPrefix: "As a senior test developer, implement the test code following best practices and ensuring reliability."
        },
        {
            name: AgentType.REVIEWER,
            role: "Quality Assurance - reviews the implementation for potential issues and improvements",
            model: config.ai.defaultModel,
            promptPrefix: "As a quality assurance expert, review the test implementation for potential issues, stability concerns, and improvement opportunities."
        },
        {
            name: AgentType.ANALYST,
            role: "Root Cause Analyst - analyzes failures and suggests solutions",
            model: config.ai.defaultModel,
            promptPrefix: "As a root cause analysis expert, analyze the problem and provide a detailed solution."
        }
    ];

    /**
     * Executes a Hybrid Detective Investigation:
     * 1. Burmese Translator (Preprocessing)
     * 2. Local AI (Ollama) - Data Parsing & Anomaly Detection (Cost Effective).
     * 3. Cloud AI (Gemini) - High-level Reasoning & Policy Audit (Expert Opinion).
     */
    static async executeRootCauseAnalysis(
        error: string,
        steps: any[],
        annotations: any[] = [],
        expectedResults: any = {}
    ): Promise<AgentResult> {
        this.init();
        this.log(`[Hybrid Orchestrator] Starting Multilingual Investigation...`);

        try {
            // STEP 0: Burmese Translation
            const annotationText = JSON.stringify(annotations);
            console.log(`[DEBUG] Raw Annotations: ${annotationText}`);
            const translatedAnnotations = await BurmeseTranslator.translateToForensicEnglish(annotationText);
            console.log(`[DEBUG] Translated Annotations: ${translatedAnnotations}`);
            this.log(`[Orchestrator] Translated Annotations: ${translatedAnnotations}`);

            // STEP 1: Local AI (First Responder - Ollama)
            const localPrompt = `
                ### Task: Identify Anomalies for Chief Investigator
                Compare the following execution steps with user annotations (translated). 
                Focus on: API response codes, calculation mismatches, and stuck UI states.
                Provide a CONCISE summary of findings.
                
                Error Trace: ${error}
                User Annotations: ${translatedAnnotations}
                Target Steps (Last 3): ${JSON.stringify(steps.slice(-3))}
            `;

            this.log(`[Local AI] Parsing data logs via ${this.PRIMARY_MODEL}...`);
            const localAnalysis = await this.callModel(this.PRIMARY_MODEL, localPrompt, false);
            this.log(`[Orchestrator] Local AI Analysis: ${localAnalysis}`);

            // STEP 2: Cloud AI (Chief Investigator - Gemini)
            this.log(`[Cloud AI] Sending evidence to Chief Investigator (Gemini)...`);
            const policySummary = "Policy: Leave calculation must ignore holidays. HR Net Pay rule applies.";
            const cloudVerdict = await CloudAIService.conductFinalAudit(localAnalysis, policySummary);

            return {
                response: localAnalysis,
                cloudVerdict: cloudVerdict,
                modelUsed: `Hybrid (${this.PRIMARY_MODEL} + Gemini)`,
                status: 'success',
                agent: 'detective-duo'
            };
        } catch (err: any) {
            this.log(`[Hybrid Orchestrator] Investigation failed: ${err.message}\n${err.stack}`);
            return {
                response: "Detective investigation failed.",
                modelUsed: 'none',
                status: 'error'
            };
        }
    }

    /**
     * Executes a test generation task (Standard Multi-Agent).
     */
    static async executeTestGeneration(requirements: string): Promise<AgentResult> {
        const multiAgentTask: MultiAgentTask = {
            task: "Generate a comprehensive Playwright test based on the provided requirements",
            context: {
                requirements: requirements,
                timestamp: new Date().toISOString()
            },
            agents: [AgentType.ARCHITECT, AgentType.CODER, AgentType.REVIEWER]
        };

        return this.executeMultiAgentTask(multiAgentTask);
    }

    private static async executeMultiAgentTask(task: MultiAgentTask): Promise<AgentResult> {
        try {
            let currentContext = JSON.stringify(task.context);
            let finalResponse = "";

            for (const agentType of task.agents) {
                const agentProfile = this.AGENT_PROFILES.find(a => a.name === agentType);
                if (!agentProfile) continue;

                const agentPrompt = `${agentProfile.promptPrefix}\n\nTask: ${task.task}\n\nContext: ${currentContext}`;
                const result = await this.callModel(agentProfile.model, agentPrompt, true);

                currentContext = JSON.stringify({
                    ...task.context,
                    [`${agentType}_output`]: result,
                    previousAgent: agentType
                });

                finalResponse = result;
            }

            return {
                response: finalResponse,
                modelUsed: this.PRIMARY_MODEL,
                status: 'success',
                agent: 'multi-agent'
            };
        } catch (err) {
            console.error('Multi-agent task failed:', err);
            return {
                response: "Multi-agent collaboration failed.",
                modelUsed: 'none',
                status: 'error'
            };
        }
    }

    private static async callModel(model: string, prompt: string, structured: boolean): Promise<string> {
        const finalPrompt = ContextManager.trimContext(prompt);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);

        const response = await fetch(this.OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: finalPrompt,
                stream: false,
                format: structured ? "json" : undefined
            }),
            signal: controller.signal as any,
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) throw new Error('Model call failed');
        const data = await response.json() as any;
        return data.response;
    }
}
