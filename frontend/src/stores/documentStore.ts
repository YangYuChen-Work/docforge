import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listDocuments, getDocument, getChapter } from '../api/documents'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<any[]>([])
  const currentDoc = ref<any>(null)
  const currentChapter = ref<any>(null)
  const loading = ref(false)

  async function fetchDocuments(params?: any) {
    loading.value = true
    try {
      documents.value = await listDocuments(params)
    } finally {
      loading.value = false
    }
  }

  async function fetchDocument(id: string) {
    currentDoc.value = await getDocument(id)
  }

  async function fetchChapter(docId: string, chapId: string) {
    currentChapter.value = await getChapter(docId, chapId)
  }

  return {
    documents,
    currentDoc,
    currentChapter,
    loading,
    fetchDocuments,
    fetchDocument,
    fetchChapter,
  }
})
