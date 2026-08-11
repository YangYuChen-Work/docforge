export type ExportProgressState =
  | 'idle'
  | 'preparing'
  | 'generating'
  | 'preparing-download'
  | 'completed'
  | 'failed'

export type ExportProgressSnapshot = {
  state: ExportProgressState
  format: string
  includeComments: boolean
  error: string
}

export type ExportProgressFlowOptions = {
  createExport: (docId: string, format: string, includeComments: boolean) => Promise<any>
  openDownload: (result: any) => void | Promise<void>
  onStateChange: (snapshot: ExportProgressSnapshot) => void | Promise<void>
  wait?: (ms: number) => Promise<void>
  docId: string
  format: string
  includeComments: boolean
  reducedMotion?: boolean
}

export function buildFailureMessage(error: any): string

export function runExportProgressFlow(options: ExportProgressFlowOptions): Promise<
  | { ok: true; result: any }
  | { ok: false; result?: any; error?: any }
>
