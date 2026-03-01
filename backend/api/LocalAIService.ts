import fetch from 'node-fetch';
import { ContextManager } from './ContextManager';
import { SkillRegistry } from './SkillRegistry';
import { AgentOrchestrator, AgentType } from './AgentOrchestrator';
import type { AgentResult } from './AgentOrchestrator';
import { config } from './config';

export interface AIResponse {
    suggestion: string;
    confidence: number;
    metadata?: any;
}

interface CachedAIResponse {
    response: string;
    modelUsed: string;
    status: 'success' | 'fallback' | 'error';
    agent?: string;
    timestamp: number;
    ttl: number;
}

export class LocalAIService {
    private static OLLAMA_URL = config.ai.ollamaGenerateUrl;
    private static EMBED_URL = config.ai.ollamaEmbedUrl;
    private static DEFAULT_MODEL = config.ai.defaultModel;
    private static EMBED_MODEL = config.ai.embedModel;
    private static TIMEOUT_MS = config.ai.timeoutMs;
    private static FALLBACK_MODEL = config.ai.fallbackModel;

    // Response cache
    private static responseCache = new Map<string, CachedAIResponse>();
    private static readonly CACHE_TTL = 18000; // 30 minutes

    /**
     * Generates a triage suggestion using skills and agentic orchestration.
     */
    static async suggestRootCause(context: { steps: any[], error: string, appVersion: string }): Promise<AgentResult> {
        const cacheKey = `triage:${this.hash(context.error)}:${context.appVersion}`;
        const cached = this.responseCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return {
                response: cached.response,
                modelUsed: cached.modelUsed,
                status: cached.status as 'success' | 'fallback' | 'error',
                agent: cached.agent,
                fromCache: true,
            } as AgentResult & { fromCache: boolean };
        }

        // Use multi-agent approach for more sophisticated analysis
        const result = await AgentOrchestrator.executeRootCauseAnalysis(
            context.error, 
            context.steps
        );
        
        // Cache the result
        this.responseCache.set(cacheKey, {
            response: result.response,
            modelUsed: result.modelUsed,
            status: result.status,
            agent: result.agent,
            timestamp: Date.now(),
            ttl: this.CACHE_TTL,
        });

        return result;
    }

    /**
     * Generates a Playwright test based on requirements using multi-agent collaboration.
     */
    static async generateTest(requirements: string): Promise<AgentResult> {
        const cacheKey = `testgen:${this.hash(requirements)}`;
        const cached = this.responseCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return {
                response: cached.response,
                modelUsed: cached.modelUsed,
                status: cached.status as 'success' | 'fallback' | 'error',
                agent: cached.agent,
                fromCache: true,
            } as AgentResult & { fromCache: boolean };
        }

        const result = await AgentOrchestrator.executeTestGeneration(requirements);
        
        // Cache the result
        this.responseCache.set(cacheKey, {
            response: result.response,
            modelUsed: result.modelUsed,
            status: result.status,
            agent: result.agent,
            timestamp: Date.now(),
            ttl: this.CACHE_TTL,
        });

        return result;
    }

    /**
     * Proposes a fix for a failed selector.
     */
    static async repairSelector(oldSelector: string, domSnapshot: string): Promise<string> {
        const rawPrompt = SkillRegistry.executeSkill("SELECTOR_REPAIR", {
            oldSelector: oldSelector,
            dom: domSnapshot
        });
        const prompt = ContextManager.trimContext(rawPrompt);

        try {
            const response = await fetch(this.OLLAMA_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: this.DEFAULT_MODEL,
                    prompt: prompt,
                    stream: false,
                    format: "json"
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API returned ${response.status}`);
            }

            const data = await response.json() as any;
            return data.response;
        } catch (err: any) {
            console.error('Selector repair failed:', err.message);
            
            // Try fallback model if configured
            if (this.FALLBACK_MODEL) {
                try {
                    const fallbackResponse = await fetch(this.OLLAMA_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: this.FALLBACK_MODEL,
                            prompt: prompt,
                            stream: false,
                            format: "json"
                        }),
                        signal: AbortSignal.timeout(this.TIMEOUT_MS)
                    });
                    
                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json() as any;
                        return data.response;
                    }
                } catch (fallbackErr) {
                    console.error('Fallback model also failed:', fallbackErr);
                }
            }
            
            return JSON.stringify({ bestSelector: oldSelector, confidence: 0, error: err.message });
        }
    }

    /**
     * Gets embeddings for semantic search in local knowledge.
     */
    static async getEmbeddings(text: string): Promise<number[]> {
        try {
            const response = await fetch(this.EMBED_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: this.EMBED_MODEL,
                    prompt: text
                }),
                signal: AbortSignal.timeout(this.TIMEOUT_MS)
            });

            if (!response.ok) {
                throw new Error(`Embedding API returned ${response.status}`);
            }

            const data = await response.json() as any;
            return data.embedding || [];
        } catch (err: any) {
            console.error('Embedding generation failed:', err.message);
            return [];
        }
    }

    /**
     * Clears the response cache.
     */
    static clearCache(): void {
        this.responseCache.clear();
    }

    /**
     * Gets cache statistics.
     */
    static getCacheStats(): { size: number } {
        return { size: this.responseCache.size };
    }

    private static hash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}
