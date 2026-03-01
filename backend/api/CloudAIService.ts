import fetch from 'node-fetch';
import { config } from './config';

export class CloudAIService {
    private static GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    private static API_KEY = process.env.GEMINI_API_KEY || ""; // User must provide this in .env

    /**
     * The Chief Investigator: High-level reasoning using Gemini.
     */
    static async conductFinalAudit(anomalySummary: string, policyContent: string): Promise<string> {
        if (!this.API_KEY) {
            return "Error: Gemini API Key not configured. Cloud investigation aborted.";
        }

        const prompt = `
            # Role: Chief Forensic Investigator
            # Task: Issue a final verdict on a suspected software bug.

            ## EVIDENCE SUMMARY (From Local AI):
            ${anomalySummary}

            ## BUSINESS POLICY (Standard Rule):
            ${policyContent}

            ## INSTRUCTION:
            1. Analyze if the anomalies violate the business policy.
            2. Issue a Verdict: [GUILTY] (Confirmed Bug) or [CLEAR] (Pass).
            3. Provide a human-readable explanation in a 'Digital Detective' tone.
            4. If GUILTY, point out the exact policy paragraph that was violated.
            5. IMPORTANT: Provide the entire explanation in BOTH English and Burmese (🇲🇲 မြန်မာဘာသာ).
        `;

        try {
            const response = await fetch(`${this.GEMINI_API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json() as any;
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error('[Cloud AI] Investigation failed:', err);
            return "Cloud investigation failed due to network or API error.";
        }
    }
}
