export interface LeavePolicyConfig {
    treatHolidayAsLeave: boolean;
}

export interface LeaveRequest {
    startDate: string;
    endDate: string;
    holidayDates: string[];
    excludeWeekends?: boolean;
}

export class LeavePolicyValidator {
    /**
     * Computes the expected leave consumption based on policy rules.
     * 
     * @param request - The leave request details including dates and holiday flags.
     * @param config - Global or tenant-specific policy configuration.
     * @returns - Number of days that should be deducted from leave balance.
     */
    static computeExpectedLeaveConsumed(request: LeaveRequest, config: LeavePolicyConfig): number {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        let totalConsumed = 0;

        // Iterate through each day in the range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
            
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = request.holidayDates.includes(dateStr);

            // Skip weekends if the policy excludes them (default true for business apps)
            if (request.excludeWeekends !== false && isWeekend) {
                continue;
            }

            if (isHoliday) {
                // If it's a holiday, only count it if the policy treats holidays as leave
                if (config.treatHolidayAsLeave) {
                    totalConsumed++;
                }
            } else {
                // Regular business day
                totalConsumed++;
            }
        }

        return totalConsumed;
    }

    /**
     * Validates observed leave balance against expected.
     */
    static validateDiscrepancy(expected: number, actual: number): { isValid: boolean; diff: number; message: string } {
        const diff = actual - expected;
        const isValid = diff === 0;
        
        return {
            isValid,
            diff,
            message: isValid ? "Leave consumption matches policy." : `Discrepancy detected: Expected ${expected} days, but observed ${actual} days.`
        };
    }
}
