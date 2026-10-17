// riis-frontend/src/features/hei/PdfIntakeStep.jsx
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, Loader2, UploadCloud } from 'lucide-react'
import {
  AUTOFILL_FIELDS,
  AUTOFILL_FIELD_LABELS,
  buildPrefill,
  validatePdfFile,
} from './pdfPrefill'

const REQUEST_TIMEOUT_MS = 90_000 // first call after an idle period can hit a cold AI/API container

const confidenceBadge = {
  HIGH: 'badge-success',
  MEDIUM: 'badge-warning',
  LOW: 'badge-error',
}

/**
 * "Step 0" of the submission portal: optional PDF upload that pre-fills Steps 1-4.
 *
 * Presentational + local request state only. The parent owns the form:
 *   onExtract(file, signal) -> Promise<PdfMetadataExtractionResponseDTO>   (does the HTTP call)
 *   onApply(result, file)   -> hydrates react-hook-form and attaches the PDF
 *   onAttachOnly(file)      -> keeps the PDF as the attachment but pre-fills nothing
 *   onContinue()            -> leave intake and show Step 1
 */
export default function PdfIntakeStep({ onExtract, onApply, onAttachOnly, onContinue }) {
  const [phase, setPhase] = useState('idle') // idle | reading | done | error
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const requestRef = useRef({ id: 0, controller: null, timer: null })

  useEffect(() => {
    const ref = requestRef.current
    return () => {
      clearTimeout(ref.timer)
      ref.controller?.abort()
    }
  }, [])

  const reset = () => {
    const ref = requestRef.current
    clearTimeout(ref.timer)
    ref.controller?.abort()
    setPhase('idle')
    setFile(null)
    setResult(null)
    setMessage('')
  }

  const handleFile = async (selected) => {
    const problem = validatePdfFile(selected)
    if (problem) {
      setPhase('error')
      setFile(null)
      setMessage(problem)
      return
    }

    const ref = requestRef.current
    clearTimeout(ref.timer)
    ref.controller?.abort()
    const controller = new AbortController()
    const requestId = ref.id + 1
    ref.id = requestId
    ref.controller = controller
    ref.timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    setFile(selected)
    setResult(null)
    setMessage('')
    setPhase('reading')

    try {
      const data = await onExtract(selected, controller.signal)
      if (requestRef.current.id !== requestId) return // a newer upload superseded this one
      clearTimeout(ref.timer)
      onApply(data, selected)
      setResult(data)
      setPhase('done')
    } catch (error) {
      if (requestRef.current.id !== requestId) return
      clearTimeout(ref.timer)
      // The PDF is still a valid attachment even when reading it failed.
      onAttachOnly(selected)
      setPhase('error')
      setMessage(
        controller.signal.aborted
          ? 'Reading the PDF took too long. You can continue and enter the details yourself.'
          : error?.message || 'We could not read this PDF. You can continue and enter the details yourself.',
      )
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  const { filled } = buildPrefill(result)
  const foundFields = AUTOFILL_FIELDS.filter((field) => filled[field])
  const warnings = Array.isArray(result?.warnings) ? result.warnings : []

  return (
    <div>
      <div className="relative mb-6">
        <div className="absolute bottom-0 left-[-32px] top-[-32px] w-1 bg-[#c9a84c]" />
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a84c]">
          START HERE · OPTIONAL
        </p>
        <h3
          className="text-[22px] font-bold tracking-tight text-[#0d1f3c]"
          style={{ fontFamily: "'Libre Baskerville', serif" }}
        >
          Upload your paper to pre-fill the form
        </h3>
        <p className="mt-2 text-[13px] text-[#6b7280]">
          We read the first pages of your PDF and fill in the title, authors, abstract and keywords.
          You will check and correct everything in the next steps before submitting.
        </p>
        <div className="mt-4 h-px w-full bg-[#e5e7eb]" />
      </div>

      {phase === 'reading' ? (
        <div
          className="flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] py-14 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="mb-4 h-9 w-9 animate-spin text-[#0d1f3c]" />
          <p className="text-sm font-semibold text-[#0d1f3c]">Reading your PDF…</p>
          <p className="mt-1 text-[12px] text-[#6b7280]">{file?.name}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 text-[12px] font-semibold text-[#6b7280] underline hover:text-[#0d1f3c]"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {phase === 'idle' || phase === 'error' ? (
        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed py-14 text-center transition ${
              isDragging ? 'border-[#c9a84c] bg-[#fff7e6]' : 'border-[#d1d5db] bg-[#f9fafb]'
            }`}
          >
            <UploadCloud className="mb-4 h-10 w-10 text-[#9ca3af]" />
            <p className="text-sm font-semibold text-[#0d1f3c]">Drag and drop your research PDF here</p>
            <p className="mt-1 text-[12px] text-[#9ca3af]">Text-based PDFs up to 20 MB. Scanned copies are attached but cannot be read.</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[6px] border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#0d1f3c] transition hover:bg-[#0d1f3c]/5">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  event.target.value = '' // allow re-selecting the same file after an error
                  if (selected) handleFile(selected)
                }}
              />
              Choose PDF
            </label>
          </div>

          {phase === 'error' ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{message}</p>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (phase === 'error' && file) onAttachOnly(file)
                onContinue()
              }}
              className="text-[13px] font-semibold text-[#0d1f3c] underline hover:text-[#0b1a33]"
            >
              {phase === 'error' && file ? 'Continue and enter details manually' : 'Skip and enter details manually'}
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'done' && result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-4">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#0d1f3c]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#0d1f3c]">{file?.name}</p>
              <p className="mt-1 text-[12px] text-[#6b7280]">
                {result.message}
              </p>

              {foundFields.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {foundFields.map((field) => (
                    <span
                      key={field}
                      className={`badge badge-soft gap-1 ${confidenceBadge[filled[field]] || 'badge-ghost'}`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {AUTOFILL_FIELD_LABELS[field]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {warnings.length > 0 ? (
            <ul className="space-y-1 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
              {warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-[12px] text-[#6b7280]">
            This PDF will also be attached to your submission, so you will not need to upload it again in Step 4.
          </p>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={reset}
              className="h-10 rounded-[6px] border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#0d1f3c] transition hover:bg-[#f8fafc]"
            >
              Choose a different PDF
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex h-10 items-center gap-2 rounded-[6px] bg-[#0d1f3c] px-6 text-sm font-semibold text-white transition hover:bg-[#0b1a33]"
            >
              {result.extracted ? 'Review in Step 1' : 'Continue with manual entry'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}