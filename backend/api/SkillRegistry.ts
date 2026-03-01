export interface AISkill {
    name: string;
    description: string;
    promptTemplate: (data: any) => string;
    outputSchema: string; // Encourages structured output
}

export class SkillRegistry {
    private static skills: Record<string, AISkill> = {
        "ROOT_CAUSE_ANALYSIS": {
            name: "Root Cause Analysis",
            description: "Analyzes test logs to find the heart of the bug.",
            promptTemplate: (data) => `Analyze these error logs and steps: ${JSON.stringify(data.logs)}. Output in JSON format with "reason", "fix", "tags" (string array), and "confidenceScore" (0-100).`,
            outputSchema: '{ "reason": "string", "fix": "string", "tags": "string[]", "confidenceScore": "number" }'
        },
        "SELECTOR_REPAIR": {
            name: "Selector Repair",
            description: "Proposes robust selectors when a test fails due to UI changes.",
            promptTemplate: (data) => `The selector "${data.oldSelector}" failed. Given this DOM snapshot: ${data.dom}, suggest a better data-test-id. Output in JSON format with "bestSelector", "confidenceScore", and "tags".`,
            outputSchema: '{ "bestSelector": "string", "confidenceScore": "number", "tags": "string[]" }'
        },
        "ASK_KB": {
            name: "Ask Knowledge Base",
            description: "Answers user questions based on the local knowledge base.",
            promptTemplate: (data) => `User Query: ${data.query}. Context from KB: ${data.context}. Provide a detailed answer. Output JSON with "answer" and "sourceDocs" (array).`,
            outputSchema: '{ "answer": "string", "sourceDocs": "string[]" }'
        }
    };

    static getSkill(name: string): AISkill | undefined {
        return this.skills[name];
    }

    static executeSkill(name: string, data: any): string {
        const skill = this.getSkill(name);
        if (!skill) throw new Error(`Skill ${name} not found`);
        return skill.promptTemplate(data);
    }
}
