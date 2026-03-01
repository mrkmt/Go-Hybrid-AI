import { LeavePolicyValidator, LeaveRequest, LeavePolicyConfig } from './LeavePolicyValidator';

describe('LeavePolicyValidator', () => {
    const holidayDates = ['2026-05-01']; // Friday

    test('should NOT count holiday when treatHolidayAsLeave is false', () => {
        const request: LeaveRequest = {
            startDate: '2026-05-01',
            endDate: '2026-05-04', // Friday, Monday (skips Sat, Sun)
            holidayDates: holidayDates
        };
        const config: LeavePolicyConfig = { treatHolidayAsLeave: false };

        const consumed = LeavePolicyValidator.computeExpectedLeaveConsumed(request, config);
        // Friday (Holiday, skip)
        // Sat (Weekend, skip)
        // Sun (Weekend, skip)
        // Monday (Work day, count)
        expect(consumed).toBe(1);
    });

    test('should count holiday when treatHolidayAsLeave is true', () => {
        const request: LeaveRequest = {
            startDate: '2026-05-01',
            endDate: '2026-05-04',
            holidayDates: holidayDates
        };
        const config: LeavePolicyConfig = { treatHolidayAsLeave: true };

        const consumed = LeavePolicyValidator.computeExpectedLeaveConsumed(request, config);
        expect(consumed).toBe(2); // Friday (Holiday, count) + Monday
    });

    test('should detect discrepancies', () => {
        const result = LeavePolicyValidator.validateDiscrepancy(2, 4);
        expect(result.isValid).toBe(false);
        expect(result.diff).toBe(2);
        expect(result.message).toContain('Expected 2 days, but observed 4 days');
    });
});
