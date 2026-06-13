import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from '../workflowStore'

describe('workflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      activeWorkflowId: null,
      currentStepIndex: 0,
      isRunning: false,
    })
  })

  describe('startWorkflow', () => {
    it('sets activeWorkflowId, resets step index to 0, and sets isRunning', () => {
      useWorkflowStore.getState().startWorkflow('code-review')
      const state = useWorkflowStore.getState()
      expect(state.activeWorkflowId).toBe('code-review')
      expect(state.currentStepIndex).toBe(0)
      expect(state.isRunning).toBe(true)
    })
  })

  describe('advanceStep', () => {
    it('increments currentStepIndex when not at last step', () => {
      useWorkflowStore.getState().startWorkflow('code-review')
      useWorkflowStore.getState().advanceStep()
      expect(useWorkflowStore.getState().currentStepIndex).toBe(1)
    })

    it('stops running when at last step', () => {
      useWorkflowStore.getState().startWorkflow('bug-fix')
      const workflow = useWorkflowStore.getState().getActiveWorkflow()!
      for (let i = 0; i < workflow.steps.length; i++) {
        useWorkflowStore.getState().advanceStep()
      }
      const state = useWorkflowStore.getState()
      expect(state.currentStepIndex).toBe(workflow.steps.length - 1)
      expect(state.isRunning).toBe(false)
    })

    it('does nothing when no active workflow', () => {
      useWorkflowStore.getState().advanceStep()
      expect(useWorkflowStore.getState().currentStepIndex).toBe(0)
      expect(useWorkflowStore.getState().isRunning).toBe(false)
    })
  })

  describe('stopWorkflow', () => {
    it('resets all workflow state', () => {
      useWorkflowStore.getState().startWorkflow('code-review')
      useWorkflowStore.getState().advanceStep()
      useWorkflowStore.getState().stopWorkflow()
      const state = useWorkflowStore.getState()
      expect(state.activeWorkflowId).toBeNull()
      expect(state.currentStepIndex).toBe(0)
      expect(state.isRunning).toBe(false)
    })
  })

  describe('getActiveWorkflow', () => {
    it('returns the active workflow object', () => {
      useWorkflowStore.getState().startWorkflow('code-review')
      const workflow = useWorkflowStore.getState().getActiveWorkflow()
      expect(workflow).not.toBeNull()
      expect(workflow!.id).toBe('code-review')
      expect(workflow!.steps.length).toBeGreaterThan(0)
    })

    it('returns null when no workflow is active', () => {
      expect(useWorkflowStore.getState().getActiveWorkflow()).toBeNull()
    })
  })

  describe('getCurrentStep', () => {
    it('returns the first step after starting', () => {
      useWorkflowStore.getState().startWorkflow('bug-fix')
      const step = useWorkflowStore.getState().getCurrentStep()
      expect(step).not.toBeNull()
      expect(step!.id).toBe('bf-1')
    })

    it('returns the correct step after advancing', () => {
      useWorkflowStore.getState().startWorkflow('bug-fix')
      useWorkflowStore.getState().advanceStep()
      const step = useWorkflowStore.getState().getCurrentStep()
      expect(step!.id).toBe('bf-2')
    })

    it('returns null when no workflow is active', () => {
      expect(useWorkflowStore.getState().getCurrentStep()).toBeNull()
    })
  })
})
