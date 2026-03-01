import { LocalAIService } from './LocalAIService';
import { ObjectRepoService } from './ObjectRepoService';
import { DbClient } from './app';

export interface HealingResult {
    originalSelector: string;
    newSelector: string;
    confidence: number;
    explanation: string;
}

export class SelfHealingService {
    /**
     * AI-driven Selector Repair: Suggests a new selector based on DOM context.
     */
    static async suggestRepair(
        objectId: string, 
        brokenSelector: string, 
        domSnapshot: string
    ): Promise<HealingResult | null> {
        console.log(`[Detective - SelfHealing] Investigating broken object: ${objectId} (${brokenSelector})`);

        // Use Local AI to analyze the DOM and find the element that "looks" like the original
        const repairJson = await LocalAIService.repairSelector(brokenSelector, domSnapshot);
        
        try {
            const data = JSON.parse(repairJson);
            if (!data.bestSelector || data.bestSelector === brokenSelector) {
                return null;
            }

            return {
                originalSelector: brokenSelector,
                newSelector: data.bestSelector,
                confidence: data.confidence || 0.5,
                explanation: data.reasoning || 'AI identified a matching element structure.'
            };
        } catch (e) {
            console.error('[SelfHealing] Failed to parse AI repair response');
            return null;
        }
    }

    /**
     * Heals the object and updates the repository.
     */
    static async healAndRegister(
        pool: DbClient,
        objectId: string,
        brokenSelector: string,
        domSnapshot: string
    ): Promise<string> {
        const repair = await this.suggestRepair(objectId, brokenSelector, domSnapshot);

        if (repair && repair.confidence > 0.7) {
            console.log(`[Detective] HEALED: ${brokenSelector} -> ${repair.newSelector}`);
            
            // Update Object Repository with new primary and move old to fallbacks
            const obj = await ObjectRepoService.getObject(pool, objectId);
            if (obj) {
                const updatedFallbacks = [...(obj.selector_fallbacks || []), brokenSelector];
                
                await pool.query(
                    `UPDATE object_repository 
                     SET selector_primary = $1, 
                         selector_fallbacks = $2::jsonb,
                         confidence = $3,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $4`,
                    [repair.newSelector, JSON.stringify(updatedFallbacks), repair.confidence, objectId]
                );
            }
            
            return repair.newSelector;
        }

        return brokenSelector; // Failed to heal with high confidence
    }
}
