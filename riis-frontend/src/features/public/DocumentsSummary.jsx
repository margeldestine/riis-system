import { FileText } from 'lucide-react'
import { documentTypeLabel, formatFileSize } from './documentFormat'

// Requirement 2: the "Documents" card on the public record page. It summarises the attached file
// (name, type, size and language). The file itself is never offered here: DASIG does not host the
// full text, and the owning institution decides who gets it.
export default function DocumentsSummary({ documents }) {
  const list = Array.isArray(documents) ? documents.filter((doc) => doc?.fileName) : []
  if (list.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Documents</p>

      <ul className="divide-y divide-slate-100">
        {list.map((doc, index) => {
          const size = formatFileSize(doc.sizeBytes)
          return (
            <li key={`${doc.fileName}-${index}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-[#1A1A2E]">{doc.fileName}</p>
                <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <div>
                    <dt className="inline text-slate-400">Type: </dt>
                    <dd className="inline">{documentTypeLabel(doc.contentType, doc.fileName)}</dd>
                  </div>
                  {size ? (
                    <div>
                      <dt className="inline text-slate-400">Size: </dt>
                      <dd className="inline">{size}</dd>
                    </div>
                  ) : null}
                  {doc.language ? (
                    <div>
                      <dt className="inline text-slate-400">Language: </dt>
                      <dd className="inline">{doc.language}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-xs text-slate-400">
        DASIG does not host the file. Use Request full text to ask the owning institution for it.
      </p>
    </div>
  )
}
