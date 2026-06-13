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
    name: '代码审查',
    description: '全面审查代码质量、潜在缺陷和改进空间',
    steps: [
      { id: 'cr-1', prompt: 'Read the current codebase and identify all changed or newly added files.', description: '识别变更文件' },
      { id: 'cr-2', prompt: 'For each changed file, analyze the code for potential bugs, edge cases, and logic errors.', description: '分析潜在缺陷' },
      { id: 'cr-3', prompt: 'Review code style, naming conventions, and adherence to best practices. Suggest improvements.', description: '审查代码风格' },
      { id: 'cr-4', prompt: 'Check for security vulnerabilities, injection risks, and unsafe patterns.', description: '安全审查' },
      { id: 'cr-5', prompt: 'Provide a summary of all findings with severity levels and actionable recommendations.', description: '生成总结' },
    ]
  },
  {
    id: 'bug-fix',
    name: '修复 Bug',
    description: '系统化地定位和修复缺陷',
    steps: [
      { id: 'bf-1', prompt: 'Reproduce and understand the bug. Describe the expected behavior vs actual behavior.', description: '理解缺陷' },
      { id: 'bf-2', prompt: 'Search for the root cause in the codebase. Trace the execution path that leads to the bug.', description: '定位根因' },
      { id: 'bf-3', prompt: 'Implement the minimal fix for the root cause. Do not refactor unrelated code.', description: '实施修复' },
      { id: 'bf-4', prompt: 'Write a test that reproduces the bug, then verify the fix makes it pass.', description: '编写测试并验证' },
    ]
  },
  {
    id: 'feature',
    name: '实现功能',
    description: '端到端的功能开发流程',
    steps: [
      { id: 'fi-1', prompt: 'Analyze the requirements. List what needs to be built and identify dependencies.', description: '分析需求' },
      { id: 'fi-2', prompt: 'Design the implementation approach. Identify files to create or modify and data structures needed.', description: '设计方案' },
      { id: 'fi-3', prompt: 'Implement the feature. Follow existing code patterns and conventions in the project.', description: '编写代码' },
      { id: 'fi-4', prompt: 'Write tests for the new feature covering normal cases and edge cases.', description: '编写测试' },
      { id: 'fi-5', prompt: 'Run lint, type check, and all tests to verify everything works.', description: '验证与检查' },
    ]
  },
  {
    id: 'generate-tests',
    name: '生成测试',
    description: '为代码生成全面的测试用例',
    steps: [
      { id: 'gt-1', prompt: 'Analyze the codebase structure. Identify all modules, components, and their relationships.', description: '分析代码结构' },
      { id: 'gt-2', prompt: 'Identify untested code paths and generate test cases for them.', description: '识别未覆盖路径' },
      { id: 'gt-3', prompt: 'Write unit tests covering normal cases, edge cases, and error handling.', description: '编写单元测试' },
      { id: 'gt-4', prompt: 'Run all tests and fix any failures. Ensure good coverage.', description: '运行并修复测试' },
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
