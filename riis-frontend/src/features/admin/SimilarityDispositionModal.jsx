// riis-frontend/src/features/admin/SimilarityDispositionModal.jsx
import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import apiClient from '../../services/apiClient'
import DispositionBadge from './DispositionBadge'
import {
  DISPOSITION_STATUSES,
  MAX_NOTE_LENGTH,
  MIN_NOTE_LENGTH,
  dispositionMeta,
  formatDateTime,
} from './similarityDisposition'

/**
 * Modal for recording the outcome of reviewing one similarity flag (one alert = one pair).
 *
 * No optimistic update on purpose: the server can answer 409 when another admin changed
 * the flag first, so the UI waits for the PATCH response and patches that single match in
 * the dashboard state (onSaved). The flag list is small and admin-only, so a ~100 ms wait
 * is cheaper than building rollback logic.
 */
export default function SimilarityDispositionModal({ group, match, onClose, onSaved, onReload }) {
  const [status, setStatus] = useState(match.status || 'OPEN')
  const [notes, setNotes] = useState(match.dispositionNotes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    apiClient
      .get(`/quality/overlaps/${match.alertId}/history`, { signal: controller.signal })
      .then((res) => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
    return () => controller.abort()
  }, [match.alertId])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saving, onClose])

  const trimmed = notes.trim()
  const unchanged = status === (match.status || 'OPEN') && trimmed === (match.dispositionNotes || '')
  const notesTooShort = trimmed.length < MIN_NOTE_LENGTH
  const canSave = !saving && !notesTooShort && !unchanged && !conflict

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const res = await apiClient.patch(`/quality/overlaps/${match.alertId}/disposition`, {
        status,
        notes: trimmed,
        expectedStatus: match.status || 'OPEN',
      })
      onSaved(res.data)
      onClose()
    } catch (err) {
      if (err?.response?.status === 409) setConflict(true)
      setError(
        err?.response?.data?.message || 'Could not save the decision. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="disposition-title">
      <div className="modal-box max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="disposition-title" className="text-lg font-bold text-[#1A1A2E]">
              Review similarity flag
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              The similarity score is an automated signal, not a finding of duplication. Record what you decided
              and why; this is saved to the audit log.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px]">
          <p>
            <span className="font-semibold text-slate-500">Submitted: </span>
            <span className="font-semibold text-[#1A1A2E]">{group.newRecordTitle}</span>
            <span className="text-slate-400"> · {group.newRecordHei}</span>
          </p>
          <p>
            <span className="font-semibold text-slate-500">Similar to: </span>
            <span className="font-semibold text-[#1A1A2E]">{match.existingRecordTitle}</span>
            <span className="text-slate-400"> · {match.existingRecordHei}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Similarity:</span>
            <span className="font-bold text-red-500">{(match.similarityScore * 100).toFixed(1)}%</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-500">Current status:</span>
            <DispositionBadge status={match.status} />
          </p>
        </div>

        <fieldset className="mt-5 space-y-2" disabled={saving}>
          <legend className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Decision</legend>
          {DISPOSITION_STATUSES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                status === option.value ? 'border-[#0d1f3c] bg-[#0d1f3c]/5' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="disposition-status"
                className="radio radio-sm mt-0.5"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
              />
              <span>
                <span className="block text-sm font-semibold text-[#1A1A2E]">{option.label}</span>
                <span className="block text-[11px] text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="mt-5">
          <label htmlFor="disposition-notes" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Notes (required)
          </label>
          <textarea
            id="disposition-notes"
            className="textarea textarea-bordered w-full text-sm"
            rows={4}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Why did you choose this? e.g. Both studies map Bohol flood hazard, but use different datasets."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={saving}
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span className={notesTooShort && notes.length > 0 ? 'text-amber-600' : ''}>
              {notesTooShort && notes.length > 0 ? `At least ${MIN_NOTE_LENGTH} characters.` : '\u00A0'}
            </span>
            <span>
              {notes.length} / {MAX_NOTE_LENGTH}
            </span>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              {conflict ? (
                <button
                  type="button"
                  className="mt-1 font-semibold underline"
                  onClick={() => {
                    onReload()
                    onClose()
                  }}
                >
                  Reload the flag log
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Review history</p>
          {historyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : history.length === 0 ? (
            <p className="text-[12px] text-slate-400">No decisions recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#1A1A2E]">{entry.actorName || 'Former user'}</span>
                    <span className="text-slate-400">{formatDateTime(entry.changedAt)}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">
                      {entry.fromStatus ? dispositionMeta(entry.fromStatus).label : '—'}
                      {' \u2192 '}
                      {entry.toStatus ? dispositionMeta(entry.toStatus).label : '—'}
                    </span>
                  </div>
                  {entry.notes ? <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.notes}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn bg-[#0d1f3c] text-white hover:bg-[#0b1a33]" onClick={handleSave} disabled={!canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save decision
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={saving ? undefined : onClose} />
    </div>
  )
}