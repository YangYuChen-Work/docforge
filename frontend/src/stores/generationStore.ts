import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTask, createTask as apiCreate, startTask as apiStart } from '../api/generation'

export const useGenerationStore = defineStore('generation', () => {
  const currentTask = ref<any>(null)
  let pollingTimer: ReturnType<typeof setInterval> | null = null

  async function createAndStart(projectId: string, templateId: string, sourceIds: string[]) {
    const task = await apiCreate({
      project_id: projectId,
      template_id: templateId,
      source_ids: sourceIds,
    })
    currentTask.value = task
    await apiStart(task.task_id)
    return task
  }

  function startPolling(taskId: string, onDone: (task: any) => void) {
    stopPolling()
    pollingTimer = setInterval(async () => {
      try {
        const task = await getTask(taskId)
        currentTask.value = task
        if (['awaiting_confirmation', 'completed', 'failed'].includes(task.status)) {
          stopPolling()
          onDone(task)
        }
      } catch (e) {
        stopPolling()
      }
    }, 3000)
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  return { currentTask, createAndStart, startPolling, stopPolling }
})
