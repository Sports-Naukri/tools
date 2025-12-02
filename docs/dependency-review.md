# Dependency Review Playbook

To keep blob uploads healthy, revisit our networking + storage dependencies once per quarter (January, April, July, October).

## Scope
- `@vercel/blob`
- `baseline-browser-mapping`
- `ai`, `@ai-sdk/*`
- Any packages touching uploads (`dexie`, `file-saver`)

## Checklist
1. Run `npm outdated @vercel/blob baseline-browser-mapping ai @ai-sdk/openai`.
2. Review release notes for breaking changes and security advisories.
3. Execute `npm audit` and capture attachment-related vulnerabilities.
4. File issues in the tracker summarizing findings and planned upgrades.

## Owners
- Primary: Chat Platform squad
- Backup: Developer Experience squad

Log outcomes in the project wiki under “Dependency Reviews” with date + action items.
