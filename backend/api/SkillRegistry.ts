export class SkillRegistry {
    private static skills: Record<string, (params: any) => string> = {
        "ROOT_CAUSE_ANALYSIS": (params) => `
            Analyze the following error: ${params.error}
            In context of these steps: ${JSON.stringify(params.steps)}
            User Notes: ${JSON.stringify(params.annotations)}
            Provide a diagnostic verdict.
        `,
        "SELECTOR_REPAIR": (params) => `
            FORENSIC TASK: Repair a broken UI selector.
            
            Original Selector: ${params.oldSelector}
            Current DOM Context (Snippet): ${params.dom}
            
            INSTRUCTION:
            1. Find an element in the DOM snippet that matches the purpose of the original selector.
            2. Suggest a NEW, stable, and unique CSS selector.
            3. Return valid JSON only: { "bestSelector": "...", "confidence": 0.0-1.0, "reasoning": "..." }
        `
    };

    static executeSkill(skillName: string, params: any): string {
        const skill = this.skills[skillName];
        if (!skill) throw new Error(`Skill ${skillName} not found.`);
        return skill(params);
    }
}
