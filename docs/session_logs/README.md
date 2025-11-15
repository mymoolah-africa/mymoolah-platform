# Session Logs - Agent Chat History

This directory contains session logs from AI agent chats to maintain continuity across sessions.

## Purpose

Since each new Cursor chat is a new agent session with no automatic memory of previous chats, session logs provide:
- **Continuity**: New agents can read what previous agents discussed
- **Context**: Understand decisions made in previous sessions
- **History**: Track problem-solving approaches and solutions
- **Learning**: See what worked and what didn't

## Session Log Format

Each session log should follow this format:

```markdown
# Session Log - [Date] - [Brief Description]

**Session Date**: YYYY-MM-DD HH:MM
**Agent**: Cursor AI Agent
**User**: André
**Session Duration**: [if known]

## Session Summary
Brief 2-3 sentence summary of what was accomplished in this session.

## Tasks Completed
- Task 1
- Task 2
- Task 3

## Key Decisions
- Decision 1 with rationale
- Decision 2 with rationale

## Files Modified
- `path/to/file1.js` - What was changed
- `path/to/file2.md` - What was changed

## Issues Encountered
- Issue 1 and how it was resolved
- Issue 2 and how it was resolved

## Next Steps
- Action item 1
- Action item 2

## Important Context for Next Agent
Any important context, gotchas, or things the next agent should know.
```

## Naming Convention

Session logs should be named: `YYYY-MM-DD_HHMM_[brief-description].md`

Example: `2025-11-14_1430_ocr-kyc-simplification.md`

## Usage

### At Session Start
1. Check for recent session logs in this directory
2. Read the most recent session log(s) to understand context
3. Review `agent_handover.md` for official handover

### At Session End
1. Create a new session log file using the template above
2. Update `agent_handover.md` with official handover
3. Commit both files to git

## Integration with Agent Handover

- **Session Logs**: Detailed chat history and context
- **Agent Handover**: Official project status and next priorities
- **Both are important**: Session logs provide context, handover provides direction

