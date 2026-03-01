# Skill: Implementing AI-Assisted Testing Platform

This skill documents the step-by-step workflow for implementing and extending the testing platform.

## Workflow: Recording to Resolution

1. **Record**: Programmer/Tester uses the Chrome Extension to walk through the business flow.
2. **Annotate**: Add step-level notes (e.g., "This should not count the holiday").
3. **Upload**: Push recording to `Recorder API`.
4. **Replay**: CI triggers `Playwright Replayer` against Staging.
5. **Triage**: 
    - AI Assistant fetches similar past issues from Vector DB.
    - `LeavePolicyValidator` flags business rule violations.
6. **Resolution**: AI proposes a fix (e.g., "Correct mapping in AttendanceComponent.ts") and creates a Jira/GitHub issue.

## Implementation Tasks (Prioritized)

### Phase A: Core Foundation
- [x] Add `data-test-id` to critical Angular controls.
- [x] Deploy `backend/api` (Express/Postgres).
- [x] Build `backend/validator` for the target domain.

### Phase B: Replayer & Triage
- [x] Configure `Playwright` to capture HAR and Traces (`testing/replayer`).
- [x] Implement multi-dimension diffing logic.
- [x] Integrate LLM for selector repair and root cause analysis.

### Phase C: Continuous Testing
- [x] Wire `Newman` (Postman) into GitHub Actions (`testing/scripts`).
- [x] Set up `k6` for daily performance baselines.
- [x] Enable `OWASP ZAP` scans for API security.

## Best Practices
- **Sanitize PII**: Always mask emails/phones in content scripts before upload.
- **Version Rules**: Keep `Validator` logic in sync with production rule engines.
- **Stable Selectors**: Never rely on auto-generated Kendo IDs; always use `data-test-id`.
