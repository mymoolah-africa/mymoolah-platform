# Cursor 2.0 Rules - Extended Reference

**Archived**: 2026-02-21  
**Source**: docs/CURSOR_2.0_RULES_FINAL.md (slimmed down)  
**Purpose**: Verbose rule details moved here to reduce main rules file size for faster agent startup.

For the essential rules, see **docs/CURSOR_2.0_RULES_FINAL.md**.

---

## Rule 6A: Zero Shortcuts — Code Examples

**WRONG approach:**
```javascript
// WRONG: Using 'voucher' as workaround for cash_out
vasType: 'voucher' // This works but violates data integrity
```

**CORRECT approach:**
```javascript
// CORRECT: Create migration to add cash_out to enum, then use it
vasType: 'cash_out' // Semantically correct, requires migration
```

**When encountering enum/schema errors:**
1. STOP - Do NOT use workarounds
2. CREATE proper migration to fix the schema
3. UPDATE models with correct values
4. TEST the proper solution
5. DOCUMENT why the proper approach was needed

See `docs/ZERO_SHORTCUTS_POLICY.md` for full policy.

---

## Rule 4: Model Selection — Full Details

**Model strengths:**
- **Claude 4.5 Opus**: Deep reasoning, precise code, debugging, back-end architecture, task decomposition, production-ready code
- **Gemini 3.0 Pro**: Rapid prototyping, front-end/UI, large contexts, multimodal, creative exploration, quick reviews
- **Claude Sonet 4.5 (Thinking)**: Use when low on credit or for basic tasks

**Workflow:**
1. Plan thoroughly with Claude reasoning first
2. Front-end/UI, large files (>500 lines), multimodal → Delegate to Gemini
3. Back-end, refactoring, debugging, final implementation → Handle as Claude
4. When stuck → Query Gemini for critique, then synthesize
5. After delegation → Review critically, improve, integrate
6. Use parallel delegation for independent subtasks

**Agent Selection (Auto mode):**
- General: Sonet 4.5 Thinking, Gemini 3 Pro
- Complex: Opus 4.5 Thinking, Grok 4 Thinking
- Plan mode: GPT-5 High

---

## Rule 5: Git Workflow — Full Details

**Official workflow:**
1. Local Development: Develop on `/Users/andremacbookpro/mymoolah/`
2. Commit and push: `git add . && git commit -m "[description]"` **AND** `git push origin main` (agent does both)
3. Pull in Codespaces: User runs `git pull origin main`
4. Test in Codespaces: User tests
5. GitHub = source of truth

**Critical:** Local = Development, Codespaces = Testing, GitHub = Source of Truth. Agent never leaves push to user.
