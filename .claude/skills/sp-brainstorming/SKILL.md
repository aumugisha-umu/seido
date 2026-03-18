---
name: sp-brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Search existing codebase for similar patterns/utilities that could be reused or extended
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`

**Implementation — Auto-invoke Ralph:**
- After saving the design doc, assess complexity:
  - **Simple** (1-2 files, single concern, < 30 min): Implement directly without Ralph
  - **Non-trivial** (3+ files, multiple concerns, cross-cutting): **Automatically invoke `sp-ralph`** with the design doc as input
- When invoking Ralph, pass: `"Implement the validated design from docs/plans/YYYY-MM-DD-<topic>-design.md"` + a summary of the design
- Do NOT ask "Ready to implement?" — just proceed with Ralph unless the user explicitly says to stop after design

**Post-implementation — Auto-invoke Compound:**
- After Ralph completes (all stories passed), **automatically invoke `sp-compound`** to capture learnings
- This ensures patterns, pitfalls, and architectural decisions are recorded in AGENTS.md and progress.txt
- Do NOT ask "Want to compound?" — just do it as part of the chain: Brainstorming → Ralph → Compound

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense
