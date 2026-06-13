# Codex-like MiMo Workbench Design

> Date: 2026-06-13
> Status: Approved direction, implementation-ready

## Goal

Make MiMoCode GUI feel like a mature native desktop workbench inspired by Codex Desktop while keeping MiMoCode focused on programming and technical work. The UI should be compact, calm, and efficient: left navigation, central work surface, right inspector, and a strong bottom prompt composer.

## Product Boundary

MiMoCode GUI remains a programming and technical work desktop. It must not drift into a writing workbench. The following are non-goals and should stay hidden or absent from the UI:

- Writing workbench.
- Outline, chapters, characters, worldbuilding, manuscript panels.
- Codex-only features that MiMo/OpenCode does not actually support.

## Shell Layout

Use a Codex-like three-zone workbench:

- Left sidebar: quick access, project/session entry points, plugin entry.
- Center: native MiMoCode work surface for chat/workbench or plugin management; OpenCode Web UI is not the default main flow.
- Right inspector: review, terminal, context/inspector, versions, bookmarks.

The center should not become a marketing dashboard. Empty states should be practical and task-oriented.

## Bottom Prompt Composer

`Compose / Plan / Build` belongs inside the bottom input box, not as a global top-level app mode. It acts as execution intent for the current prompt.

Controls:

- Mode: `Compose`, `Plan`, `Build`.
- Access: `Read Only`, `Workspace`, `Full Access` mapped to existing permission values.
- Dream / Distill are project-level intelligence statuses, not prompt-level toggles. Dream reflects persistent memory/checkpoint health; Distill reflects whether repeated workflows are ready to become reusable skills.
- Model: keep the existing MiMo model selector.

Implementation note: do not invent unsupported CLI flags. Prompt mode is sent as concise metadata; Dream and Distill should stay in the project/workbench status surface and should not be injected into every prompt.

## Plugin Page

Plugins stay in the product. MiMoCode is OpenCode-derived and can benefit from a rich plugin ecosystem.

Plugin page design:

- Open from the left sidebar plugin item.
- Use a Codex-like settings/library layout.
- Show installed count, enabled count, and compatibility summary.
- For each plugin show name, description, path, enabled state, capability chips, configuration action, and remove action.
- Empty state should explain that plugins appear after registration in mimo CLI/OpenCode-compatible locations.

## Visual Direction

Aesthetic: refined utilitarian desktop. Compact spacing, restrained contrast, low-saturation accents, crisp borders, and clear hierarchy. MiMo-specific identity should appear in labels and chips, not decorative clutter.

## Verification

- Build renderer with `npm run build`.
- Build Electron with `npm run build:electron`.
- Run tests with `npm test -- --run`.
- Confirm no writing workbench entry appears in navigation or plugin page.
\n## Web UI Boundary\n\nOpenCode Web UI must not be the default work surface. It can remain as an optional compatibility or diagnostics fallback, but the product value should live in the native MiMoCode GUI: prompt composer, Compose/Plan/Build, access controls, plugin management, review, context, terminal, and project workflow surfaces.\n
