import fetch from 'node-fetch';
import { ContextManager } from './ContextManager';
import { config } from './config';

export interface AgentResult {
    response: string;
    modelUsed: string;
    status: 'success' | 'fallback' | 'error';
    agent?: string; // Added to track which agent processed the request
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
     * Executes a task with agentic reasoning and fallback mechanisms.
     */
    static async executeTask(prompt: string, options: { structured: boolean } = { structured: true }): Promise<AgentResult> {
        try {
            // Step 1: Attempt with Primary Model (Qwen)
            const result = await this.callModel(this.PRIMARY_MODEL, prompt, options.structured);
            return { response: result, modelUsed: this.PRIMARY_MODEL, status: 'success' };
        } catch (err) {
            if (!this.FALLBACK_MODEL) {
                return { response: "Primary model failed and no fallback model is configured.", modelUsed: this.PRIMARY_MODEL, status: 'error' };
            }

            console.warn(`Primary model ${this.PRIMARY_MODEL} failed, attempting fallback...`);

            try {
                // Step 2: Fallback to Secondary Model
                const result = await this.callModel(this.FALLBACK_MODEL, prompt, options.structured);
                return { response: result, modelUsed: this.FALLBACK_MODEL, status: 'fallback' };
            } catch (fallbackErr) {
                return { response: "All models failed.", modelUsed: 'none', status: 'error' };
            }
        }
    }

    /**
     * Executes a multi-agent collaboration task.
     */
    static async executeMultiAgentTask(task: MultiAgentTask): Promise<AgentResult> {
        try {
            let currentContext = JSON.stringify(task.context);
            let finalResponse = "";
            
            // Process through each agent in sequence
            for (const agentType of task.agents) {
                const agentProfile = this.AGENT_PROFILES.find(a => a.name === agentType);
                if (!agentProfile) {
                    continue;
                }
                
                const agentPrompt = `${agentProfile.promptPrefix}\n\nTask: ${task.task}\n\nContext: ${currentContext}`;
                const result = await this.callModel(agentProfile.model, agentPrompt, true);
                
                // Update context with agent's output
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
                status: 'error',
                agent: 'multi-agent'
            };
        }
    }

    /**
     * Executes a specialized root cause analysis with multi-agent collaboration.
     */
    static async executeRootCauseAnalysis(
        error: string, 
        steps: any[],
        annotations?: any[],
        expectedResults?: any
    ): Promise<AgentResult> {
        const multiAgentTask: MultiAgentTask = {
            task: "Analyze the provided error, test steps, user annotations, and expected results to identify the root cause and suggest a solution",
            context: {
                error: error,
                steps: steps,
                annotations: annotations || [],
                expectedResults: expectedResults || {},
                timestamp: new Date().toISOString()
            },
            agents: [AgentType.ANALYST]
        };
        
        return this.executeMultiAgentTask(multiAgentTask);
    }

    /**
     * Executes a test generation task with multi-agent collaboration.
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

    private static async callModel(model: string, prompt: string, structured: boolean): Promise<string> {
        // Here we could also add "thoughts" accumulation for agentic chain-of-thought
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
