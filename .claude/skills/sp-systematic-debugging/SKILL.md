---
name: sp-systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits

4. **Trace Data Flow**
   - Where does bad value originate?
   - Keep tracing up until you find the source

### Phase 2: Pattern Analysis

1. **Find Working Examples** - Locate similar working code
2. **Compare Against References** - Read reference implementation COMPLETELY
3. **Identify Differences** - List every difference

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis** - "I think X is the root cause because Y"
2. **Test Minimally** - SMALLEST possible change
3. **Verify Before Continuing** - Did it work?

### Phase 4: Implementation

1. **Create Failing Test Case** - Use sp-test-driven-development
2. **Implement Single Fix** - ONE change at a time
3. **Verify Fix** - Test passes? No regressions?
4. **If 3+ Fixes Failed** - Question architecture, discuss before more fixes

## Red Flags - STOP and Follow Process

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow

**ALL of these mean: STOP. Return to Phase 1.**
