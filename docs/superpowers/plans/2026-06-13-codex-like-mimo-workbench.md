# Codex-like MiMo Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mature Codex-like MiMoCode workbench UI while preserving programming-only product scope.

**Architecture:** Reuse the existing React/Electron shell. Add a center workspace view state for plugins, refine the existing prompt composer controls, and enhance the existing `PluginManager` component instead of creating a separate plugin system.

**Tech Stack:** React 18, TypeScript, Zustand, Electron, existing CSS variables.

---

### Task 1: Add Workbench View State

**Files:**
- Modify: `src/App.tsx`

- [ ] Add `PluginManager` import.
- [ ] Add `workspaceView` state with `workbench` and `plugins`.
- [ ] Make sidebar search open existing search.
- [ ] Make sidebar plugins switch the center surface to plugin page.
- [ ] Keep Web UI and chat behavior unchanged when `workspaceView` is `workbench`.

### Task 2: Refine Prompt Composer Controls

**Files:**
- Modify: `src/components/Chat/MessageInput.tsx`
- Modify: `src/App.css`

- [ ] Add local mode state: `compose`, `plan`, `build`.
- [ ] Keep access mapped to existing permission values: `readonly`, `edit`, `execute`.
- [ ] Show Dream and Distill as project-level status cards, not prompt toggles.
- [ ] Send prompt metadata only in the message text; do not add unsupported CLI flags.
- [ ] Style controls as compact Codex-like chips.

### Task 3: Upgrade Plugin Manager Page

**Files:**
- Modify: `src/components/Settings/PluginManager.tsx`
- Modify: `src/App.css`

- [ ] Convert plugin manager into a full center page when used from sidebar.
- [ ] Show installed/enabled counts.
- [ ] Add capability and compatibility chips derived from existing plugin fields.
- [ ] Keep enable/disable and remove actions using existing store methods.
- [ ] Keep empty state technical and programming-focused.

### Task 4: Verify Scope And Build

**Files:**
- Check: `docs/compose/specs/2026-06-13-mimocode-gui-product-roadmap.md`
- Run: `npm run build`
- Run: `npm run build:electron`
- Run: `npm test -- --run`

- [ ] Confirm Phase 5 writing workbench remains paused.
- [ ] Confirm no writing workbench UI entry is introduced.
- [ ] Fix only errors caused by these changes.
