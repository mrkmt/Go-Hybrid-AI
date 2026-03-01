export class ContextManager {
    private static MAX_TOKENS = 4096; // Example limit for local models
    private static APPROX_CHARS_PER_TOKEN = 4;

    /**
     * Truncates context to fit within token limits while preserving most recent info.
     * @param contextString - The full context to be sent to the LLM.
     */
    static trimContext(contextString: string, limit: number = this.MAX_TOKENS): string {
        const charLimit = limit * this.APPROX_CHARS_PER_TOKEN;
        if (contextString.length <= charLimit) {
            return contextString;
        }

        // Keep the start (system prompt) and the end (latest steps/errors)
        const keepStart = Math.floor(charLimit * 0.2);
        const keepEnd = charLimit - keepStart - 100; // Leaving room for the separator

        return contextString.substring(0, keepStart) +
            "\n... [Context Truncated for Token Control] ...\n" +
            contextString.substring(contextString.length - keepEnd);
    }

    /**
     * Estimates token count for a string.
     */
    static estimateTokens(text: string): number {
        return Math.ceil(text.length / this.APPROX_CHARS_PER_TOKEN);
    }
}
