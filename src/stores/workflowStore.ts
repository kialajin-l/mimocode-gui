import { create } from 'zustand'

export interface WorkflowStep {
  id: string
  prompt: string
  description: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
}

const PREDEFINED_WORKFLOWS: Workflow[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Thoroughly review code for quality, bugs, and improvements',
    steps: [
      { id: 'cr-1', prompt: 'Read the current codebase and identify all changed or newly added files.', description: 'Identify changed files' },
      { id: 'cr-2', prompt: 'For each changed file, analyze the code for potential bugs, edge cases, and logic errors.', description: 'Analyze for bugs' },
      { id: 'cr-3', prompt: 'Review code style, naming conventions, and adherence to best practices. Suggest improvements.', description: 'Review code style' },
      { id: 'cr-4', prompt: 'Check for security vulnerabilities, injection risks, and unsafe patterns.', description: 'Security review' },
      { id: 'cr-5', prompt: 'Provide a summary of all findings with severity levels and actionable recommendations.', description: 'Generate summary' },
    ]
  },
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Systematic approach to finding and fixing a bug',
    steps: [
      { id: 'bf-1', prompt: 'Reproduce and understand the bug. Describe the expected behavior vs actual behavior.', description: 'Understand the bug' },
      { id: 'bf-2', prompt: 'Search for the root cause in the codebase. Trace the execution path that leads to the bug.', description: 'Find root cause' },
      { id: 'bf-3', prompt: 'Implement the minimal fix for the root cause. Do not refactor unrelated code.', description: 'Implement fix' },
      { id: 'bf-4', prompt: 'Write a test that reproduces the bug, then verify the fix makes it pass.', description: 'Write test & verify' },
    ]
  },
  {
    id: 'feature',
    name: 'Feature Implementation',
    description: 'End-to-end feature development workflow',
    steps: [
      { id: 'fi-1', prompt: 'Analyze the requirements. List what needs to be built and identify dependencies.', description: 'Analyze requirements' },
      { id: 'fi-2', prompt: 'Design the implementation approach. Identify files to create or modify and data structures needed.', description: 'Design approach' },
      { id: 'fi-3', prompt: 'Implement the feature. Follow existing code patterns and conventions in the project.', description: 'Implement code' },
      { id: 'fi-4', prompt: 'Write tests for the new feature covering normal cases and edge cases.', description: 'Write tests' },
      { id: 'fi-5', prompt: 'Run lint, type check, and all tests to verify everything works.', description: 'Verify & lint' },
    ]
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Generate comprehensive documentation for code',
    steps: [
      { id: 'doc-1', prompt: 'Analyze the codebase structure. Identify all modules, components, and their relationships.', description: 'Analyze codebase' },
      { id: 'doc-2', prompt: 'Document the public API surface: exports, function signatures, parameters, and return types.', description: 'Document API' },
      { id: 'doc-3', prompt: 'Create usage examples for each major component or function.', description: 'Create examples' },
      { id: 'doc-4', prompt: 'Update README.md with project overview, setup instructions, and architecture overview.', description: 'Update README' },
    ]
  }
]

interface WorkflowState {
  workflows: Workflow[]
  activeWorkflowId: string | null
  currentStepIndex: number
  isRunning: boolean
  startWorkflow: (workflowId: string) => void
  advanceStep: () => void
  stopWorkflow: () => void
  resetWorkflow: () => void
  getActiveWorkflow: () => Workflow | null
  getCurrentStep: () => WorkflowStep | null
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: PREDEFINED_WORKFLOWS,
  activeWorkflowId: null,
  currentStepIndex: 0,
  isRunning: false,

  startWorkflow: (workflowId) => {
    set({ activeWorkflowId: workflowId, currentStepIndex: 0, isRunning: true })
  },

  advanceStep: () => {
    const { activeWorkflowId, currentStepIndex, workflows } = get()
    if (!activeWorkflowId) return
    const workflow = workflows.find(w => w.id === activeWorkflowId)
    if (!workflow) return
    if (currentStepIndex + 1 >= workflow.steps.length) {
      set({ isRunning: false })
    } else {
      set({ currentStepIndex: currentStepIndex + 1 })
    }
  },

  stopWorkflow: () => {
    set({ activeWorkflowId: null, currentStepIndex: 0, isRunning: false })
  },

  resetWorkflow: () => {
    set({ currentStepIndex: 0, isRunning: true })
  },

  getActiveWorkflow: () => {
    const { workflows, activeWorkflowId } = get()
    return workflows.find(w => w.id === activeWorkflowId) || null
  },

  getCurrentStep: () => {
    const workflow = get().getActiveWorkflow()
    if (!workflow) return null
    return workflow.steps[get().currentStepIndex] || null
  }
}))
