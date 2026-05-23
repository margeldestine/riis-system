import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Loader2,
  Plus,
  UploadCloud,
  X,
  ChevronRight,
  Info
} from 'lucide-react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import apiClient from '../../services/apiClient'

const currentYear = new Date().getFullYear()
const doiPattern = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i
const orcidPattern = /^(\d{4}-){3}\d{3}[\dX]$/i
const conferenceUrlPattern = /^https?:\/\/.+/i

function formatOrcidInput(value) {
  const digits = (value ?? '').toString().replace(/\D/g, '').slice(0, 16)
  const chunks = digits.match(/.{1,4}/g) || []
  return chunks.join('-')
}

function formatDoiInput(value) {
  const trimmed = (value ?? '').toString().trim()
  if (!trimmed) return ''

  const withoutPrefix = trimmed
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim()

  if (!withoutPrefix) return ''
  if (/^10\.\S+/i.test(withoutPrefix)) return withoutPrefix
  if (/^10\d/.test(withoutPrefix)) return `10.${withoutPrefix.slice(2)}`
  if (/^\d{4,9}\/\S+/i.test(withoutPrefix)) return `10.${withoutPrefix}`
  return withoutPrefix
}

function formatConferenceUrlInput(value) {
  const trimmed = (value ?? '').toString().trim()
  if (!trimmed) return ''

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)) return trimmed
  if (!/[./]/.test(trimmed)) return trimmed

  return `https://${trimmed.replace(/^\/+/, '')}`
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return atob(padded)
}

function getJwtExpMs(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]))
    const expSeconds = Number(payload?.exp)
    if (!Number.isFinite(expSeconds)) return null
    return expSeconds * 1000
  } catch {
    return null
  }
}

function isTokenExpiringSoon(token, thresholdMs) {
  const expMs = getJwtExpMs(token)
  if (!expMs) return false
  return expMs - Date.now() <= thresholdMs
}

function extractTokenFromResponse(data) {
  if (!data) return ''
  if (typeof data === 'string') return data.replace(/^Bearer\s+/i, '').trim()

  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    data.idToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    ''

  return typeof token === 'string'
    ? token.replace(/^Bearer\s+/i, '').trim()
    : ''
}

async function ensureFreshToken() {
  const token = localStorage.getItem('token') || ''
  if (!token) return ''

  if (!isTokenExpiringSoon(token, 5 * 60 * 1000)) return token

  const response = await fetch('http://localhost:8080/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status}`)
  }

  const data = await response.json().catch(() => null)
  const nextToken = extractTokenFromResponse(data)
  if (!nextToken) {
    throw new Error('Refresh succeeded but no token was returned by the server.')
  }

  localStorage.setItem('token', nextToken)
  return nextToken
}

const stepDefinitions = [
  {
    id: 1,
    label: 'Research Identification',
    fields: [
      'title',
      'researchType',
      'completionYear',
      'fundingSource',
      'publicationVenue',
    ],
  },
  {
    id: 2,
    label: 'Team & Authors',
    fields: ['authors', 'principalInvestigator', 'institutionalAffiliation'],
  },
  {
    id: 3,
    label: 'Research Details',
    fields: ['abstractText', 'keywords'],
  },
  {
    id: 4,
    label: 'Metadata & Attachments',
    fields: ['subjectDc', 'coverageDc', 'rightsDc', 'doi', 'conferenceUrl', 'attachment'],
  },
  {
    id: 5,
    label: 'Review & Submit',
    fields: [],
  },
]

const researchTypes = [
  'Funded Project',
  'Journal Article',
  'Conference Paper',
  'Innovation Output',
  'Community Extension Research',
]

const themeOptions = [
  'Health & Medical',
  'Climate & Env',
  'Agriculture',
  'Education & Social',
  'Tech & Innovation',
]

function countWords(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

const authorSchema = z.object({
  fullName: z.string().trim().min(1, 'Author full name is required.'),
  orcidId: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || orcidPattern.test(value), {
      message: 'Use the ORCID format 0000-0000-0000-0000.',
    }),
})

const submissionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Research title is required.')
      .max(500, 'Research title must be 500 characters or fewer.'),
    researchType: z.string().trim().min(1, 'Research type is required.'),
    completionYear: z.coerce
      .number({
        invalid_type_error: 'Completion year is required.',
      })
      .int('Completion year must be a whole number.')
      .min(1900, 'Completion year must be valid.')
      .max(currentYear, `Completion year cannot exceed ${currentYear}.`),
    fundingSource: z.string().trim().min(1, 'Funding source is required.'),
    publicationVenue: z
      .string()
      .trim()
      .min(1, 'Publication venue or status is required.'),
    authors: z.array(authorSchema).min(1, 'Add at least one author.'),
    principalInvestigator: z
      .string()
      .trim()
      .min(1, 'Select a principal investigator.'),
    institutionalAffiliation: z
      .string()
      .trim()
      .min(1, 'Institutional affiliation is required.'),
    abstractText: z
      .string()
      .trim()
      .min(1, 'Abstract is required.')
      .superRefine((value, ctx) => {
        const words = countWords(value)
        if (words < 100 || words > 500) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Abstract must be between 100 and 500 words.',
          })
        }
      }),
    keywords: z
      .array(z.string().trim().min(1))
      .min(3, 'Add at least 3 keywords.')
      .max(10, 'You can add up to 10 keywords only.'),
    subjectDc: z.string().trim().min(1, 'Subject (DC) is required.'),
    coverageDc: z.string().trim().min(1, 'Coverage (DC) is required.'),
    rightsDc: z.string().trim().min(1, 'Rights (DC) is required.'),
    doi: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || doiPattern.test(value), {
        message: 'Use a DOI like 10.1234/example.',
      }),
    conferenceUrl: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || conferenceUrlPattern.test(value), {
        message: 'Use a valid conference URL starting with http:// or https://.',
      }),
    attachment: z
      .custom((value) => value === null || value instanceof File, {
        message: 'Attachment must be a PDF file.',
      })
      .nullable()
      .optional(),
  })
  .superRefine((values, ctx) => {
    const authorNames = values.authors
      .map((author) => author.fullName.trim())
      .filter(Boolean)
    if (
      values.principalInvestigator &&
      !authorNames.includes(values.principalInvestigator)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalInvestigator'],
        message: 'Principal investigator must match one of the listed authors.',
      })
    }

    if (
      values.attachment &&
      values.attachment.type &&
      values.attachment.type !== 'application/pdf'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attachment'],
        message: 'Only PDF attachments are supported.',
      })
    }
  })

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data

  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (data?.error) return data.error
  if (typeof data === 'string' && data.trim()) return data

  return fallbackMessage
}

function FieldMessage({ message }) {
  if (!message) return null
  return <p className="mt-2 text-sm text-red-600">{message}</p>
}

function ErrorSummaryBanner({ errors, onDismiss }) {
  if (!errors || errors.length === 0) return null

  const scrollToField = (fieldName) => {
    const el = document.getElementById(`field-${fieldName}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus()
    }
  }

  return (
    <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">Submission blocked — correct the following:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {errors.map((err, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => scrollToField(err.field)}
                  className="text-left text-red-700 hover:text-red-900"
                >
                  {err.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function StepProgress({ currentStep }) {
  return (
    <div className="relative mb-10 mt-4 flex items-center justify-center">
      <div className="absolute top-5 left-0 -z-10 h-[2px] w-full px-16">
        <div className="h-full w-full bg-slate-200"></div>
      </div>
      <div className="flex w-full max-w-4xl justify-between px-8">
        {stepDefinitions.map((step) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center bg-white px-2">
              <div
                className={`flex h-10 w-10 items-center justify-center font-bold ${
                  isCompleted
                    ? 'bg-[#C9A84C] text-white'
                    : isCurrent
                      ? 'bg-[#1A1A2E] text-white'
                      : 'border border-slate-300 bg-white text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <div className="mt-3 w-28 text-center">
                <p
                  className={`text-xs ${
                    isCompleted
                      ? 'font-bold text-[#C9A84C]'
                      : isCurrent
                        ? 'font-bold text-[#1A1A2E]'
                        : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepHeader({ stepId, title }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#C9A84C]">
        STEP {stepId} OF 5
      </p>
      <h3 className="border-l-4 border-[#C9A84C] pl-3 text-2xl font-serif text-[#1A1A2E]">
        {title}
      </h3>
    </div>
  )
}

function BasicInfoStep({ register, errors }) {
  return (
    <div>
      <StepHeader stepId={1} title="Research Identification" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Research Title <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            {...register('title')}
            id="field-title"
            placeholder="Enter the full research title"
            className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.title ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <FieldMessage message={errors.title?.message} />
        </div>

        <div className="space-y-2">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Research Type <span className="text-[#C9A84C]">*</span>
          </label>
          <select
            {...register('researchType')}
            className={`w-full rounded-md border p-3 text-sm outline-none transition focus:ring-1 ${errors.researchType ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          >
            <option value="">Select research type</option>
            {researchTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldMessage message={errors.researchType?.message} />
        </div>

        <div className="space-y-2">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Completion Year <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            {...register('completionYear', { valueAsNumber: true })}
            type="number"
            max={currentYear}
            placeholder={`Up to ${currentYear}`}
            className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.completionYear ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <FieldMessage message={errors.completionYear?.message} />
        </div>

        <div className="space-y-2">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Funding Source <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            {...register('fundingSource')}
            placeholder="Funding agency or grant source"
            className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.fundingSource ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <FieldMessage message={errors.fundingSource?.message} />
        </div>

        <div className="space-y-2">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Publication Venue / Status <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            {...register('publicationVenue')}
            placeholder="Journal, conference, repository, or current status"
            className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.publicationVenue ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <FieldMessage message={errors.publicationVenue?.message} />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50/50 p-4 text-sm text-[#1A1A2E]">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
        <p>
          Ensure all information provided is accurate and matches the official documentation of your research output.
        </p>
      </div>
    </div>
  )
}

function TeamAffiliationStep({
  control,
  register,
  errors,
  authorFields,
  appendAuthor,
  removeAuthor,
  authorOptions,
}) {
  return (
    <div>
      <StepHeader stepId={2} title="Team & Authors" />
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Authors <span className="text-[#C9A84C]">*</span>
              </p>
              <p className="text-sm text-slate-500">
                Add every author included in the submission.
              </p>
            </div>
            <button
              type="button"
              onClick={appendAuthor}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Author
            </button>
          </div>

          <div className="space-y-3">
            {authorFields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-md border border-slate-200 bg-[#F9FAFB] p-4"
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto]">
                  <div className="space-y-2">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Full Name <span className="text-[#C9A84C]">*</span>
                    </label>
                    <input
                      {...register(`authors.${index}.fullName`)}
                      placeholder="Author full name"
                      className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.authors?.[index]?.fullName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
                    />
                    <FieldMessage message={errors.authors?.[index]?.fullName?.message} />
                  </div>

                  <div className="space-y-2">
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      ORCID iD
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-400">optional</span>
                    </label>
                    <Controller
                      control={control}
                      name={`authors.${index}.orcidId`}
                      render={({ field: controllerField }) => (
                        <input
                          {...controllerField}
                          value={controllerField.value ?? ''}
                          onChange={(event) => {
                            controllerField.onChange(
                              formatOrcidInput(event.target.value),
                            )
                          }}
                          placeholder="0000-0000-0000-0000"
                          maxLength={19}
                          className="w-full rounded-md border border-slate-200 bg-[#FFFFFF] p-3 text-sm placeholder:text-slate-400 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
                        />
                      )}
                    />
                    <FieldMessage message={errors.authors?.[index]?.orcidId?.message} />
                  </div>

                  <div className="flex items-end pb-[2px]">
                    <button
                      type="button"
                      onClick={() => removeAuthor(index)}
                      disabled={authorFields.length === 1}
                      className="inline-flex h-[46px] items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <FieldMessage message={errors.authors?.message} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Principal Investigator <span className="text-[#C9A84C]">*</span>
            </label>
            <select
              {...register('principalInvestigator')}
              className={`w-full rounded-md border p-3 text-sm outline-none transition focus:ring-1 ${errors.principalInvestigator ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
            >
              <option value="">Select principal investigator</option>
              {authorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldMessage message={errors.principalInvestigator?.message} />
          </div>

          <div className="space-y-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Institutional Affiliation <span className="text-[#C9A84C]">*</span>
            </label>
            <input
              {...register('institutionalAffiliation')}
              readOnly
              className={`w-full rounded-md border p-3 text-sm text-[#1A1A2E] outline-none ${errors.institutionalAffiliation ? 'border-red-400' : 'border-slate-200 bg-slate-50'}`}
            />
            <FieldMessage message={errors.institutionalAffiliation?.message} />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50/50 p-4 text-sm text-[#1A1A2E]">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
          <p>
            By proceeding, you confirm that you have obtained the consent of all authors listed above to share their information in accordance with RA 10173 (Data Privacy Act of 2012).
          </p>
        </div>
      </div>
    </div>
  )
}

function KeywordsInput({
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  keywordInput,
  setKeywordInput,
  error,
}) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      onAddKeyword()
    }
  }

  return (
    <div className="space-y-2">
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Keywords <span className="text-[#C9A84C]">*</span>
      </label>
      <div className={`rounded-md border px-4 py-3 transition focus-within:ring-1 ${error ? 'border-red-400 focus-within:border-red-400 focus-within:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus-within:border-[#1A1A2E] focus-within:ring-[#1A1A2E]'}`}>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="inline-flex items-center gap-2 rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
            >
              {keyword}
              <button
                type="button"
                onClick={() => onRemoveKeyword(keyword)}
                className="text-green-600 transition hover:text-green-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {keywords.length < 10 ? (
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={onAddKeyword}
              placeholder="Type a keyword and press Enter"
              className="min-w-[220px] flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-slate-400 outline-none"
            />
          ) : null}
        </div>
      </div>
      <div className="mt-1 flex justify-end">
        <p className="text-xs text-slate-400">{keywords.length} / 10 keywords</p>
      </div>
      <FieldMessage message={error} />
    </div>
  )
}

function ResearchDetailsStep({
  register,
  errors,
  abstractText,
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  keywordInput,
  setKeywordInput,
}) {
  const words = countWords(abstractText)

  return (
    <div>
      <StepHeader stepId={3} title="Research Details" />
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Abstract <span className="text-[#C9A84C]">*</span>
          </label>
          <textarea
            {...register('abstractText')}
            id="field-abstractText"
            rows={9}
            placeholder="Write a concise abstract"
            className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.abstractText ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <div className="mt-1 flex justify-end">
            <span
              className={`text-xs ${
                words >= 100 && words <= 500 ? 'text-slate-400' : 'text-amber-600'
              }`}
            >
              {words} / 100-500 words
            </span>
          </div>
          <FieldMessage message={errors.abstractText?.message} />
        </div>

        <KeywordsInput
          keywords={keywords}
          onAddKeyword={onAddKeyword}
          onRemoveKeyword={onRemoveKeyword}
          keywordInput={keywordInput}
          setKeywordInput={setKeywordInput}
          error={errors.keywords?.message}
        />
      </div>
    </div>
  )
}

function AttachmentDropzone({ attachment, onFileSelect, error }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <div className="mt-4 space-y-2">
      <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Full Paper PDF
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-400">optional</span>
      </label>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center transition ${
          isDragging
            ? 'border-[#C9A84C] bg-[#FFFBF1]'
            : 'border-slate-300 bg-slate-50'
        }`}
      >
        <UploadCloud className="mb-4 h-10 w-10 text-slate-400" />
        <p className="text-sm font-semibold text-[#1A1A2E]">
          Drag and drop a PDF file here
        </p>
        <p className="mt-1 text-xs text-slate-500">
          The file stays local until the final submission step.
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
          />
          Choose PDF
        </label>
        {attachment ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm text-[#1A1A2E] shadow-sm">
            <p className="font-semibold">{attachment.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {(attachment.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : null}
      </div>
      <FieldMessage message={error} />
    </div>
  )
}

function DublinCoreMetadataStep({
  control,
  register,
  errors,
  attachment,
  onFileSelect,
}) {
  return (
    <div>
      <StepHeader stepId={4} title="Metadata & Files" />
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Subject (DC) <span className="text-[#C9A84C]">*</span>
            </label>
            <select
              {...register('subjectDc')}
              className={`w-full rounded-md border p-3 text-sm outline-none transition focus:ring-1 ${errors.subjectDc ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          >
            <option value="">Select S&amp;T theme</option>
              {themeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldMessage message={errors.subjectDc?.message} />
          </div>

          <div className="space-y-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Coverage (DC) <span className="text-[#C9A84C]">*</span>
            </label>
            <input
              {...register('coverageDc')}
              placeholder="Region VII, institution, or relevant locale"
              className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.coverageDc ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <FieldMessage message={errors.coverageDc?.message} />
          </div>

          <div className="space-y-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Rights (DC) <span className="text-[#C9A84C]">*</span>
            </label>
            <input
              {...register('rightsDc')}
              placeholder="Copyright, usage notes, or permissions"
              className={`w-full rounded-md border p-3 text-sm placeholder:text-slate-400 outline-none transition focus:ring-1 ${errors.rightsDc ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-slate-200 bg-[#FFFFFF] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]'}`}
          />
          <FieldMessage message={errors.rightsDc?.message} />
          </div>

          <div className="space-y-2">
            <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              DOI
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-400">optional</span>
            </label>
            <Controller
              control={control}
              name="doi"
              render={({ field: controllerField }) => (
                <input
                  {...controllerField}
                  value={controllerField.value ?? ''}
                  onChange={(event) => {
                    controllerField.onChange(
                      formatDoiInput(event.target.value),
                    )
                  }}
                  placeholder="10.1234/example"
                  className="w-full rounded-md border border-slate-200 bg-[#FFFFFF] p-3 text-sm placeholder:text-slate-400 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
                />
              )}
            />
            <FieldMessage message={errors.doi?.message} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Conference URL
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-400">optional</span>
          </label>
          <Controller
            control={control}
            name="conferenceUrl"
            render={({ field: controllerField }) => (
              <input
                {...controllerField}
                value={controllerField.value ?? ''}
                onChange={(event) => {
                  controllerField.onChange(
                    formatConferenceUrlInput(event.target.value),
                  )
                }}
                placeholder="https://conference.example.org/paper"
                className="w-full rounded-md border border-slate-200 bg-[#FFFFFF] p-3 text-sm placeholder:text-slate-400 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
              />
            )}
          />
          <FieldMessage message={errors.conferenceUrl?.message} />
        </div>

        <AttachmentDropzone
          attachment={attachment}
          onFileSelect={onFileSelect}
          error={errors.attachment?.message}
        />
      </div>
    </div>
  )
}

function ReviewSubmitStep({ values }) {
  const summaryRows = [
    ['Research Title', values.title],
    ['Research Type', values.researchType],
    ['Completion Year', values.completionYear],
    ['Funding Source', values.fundingSource],
    ['Publication Venue / Status', values.publicationVenue],
    ['Principal Investigator', values.principalInvestigator],
    ['Institutional Affiliation', values.institutionalAffiliation],
    ['Abstract', values.abstractText],
    ['Keywords', values.keywords.join(', ')],
    ['Subject (DC)', values.subjectDc],
    ['Coverage (DC)', values.coverageDc],
    ['Rights (DC)', values.rightsDc],
    ['DOI', values.doi || 'Not provided'],
    ['Conference URL', values.conferenceUrl || 'Not provided'],
    ['Attachment', values.attachment?.name || 'No file attached'],
  ]

  return (
    <div>
      <StepHeader stepId={5} title="Review & Submit" />
      <div className="space-y-5">
        <div className="rounded-md border border-slate-200 bg-[#F9FAFB] px-5 py-4">
          <p className="text-sm text-slate-500">
            Review every section carefully before final submission.
          </p>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full">
            <tbody className="divide-y divide-slate-100 bg-white">
              {summaryRows.map(([label, value]) => (
                <tr key={label}>
                  <td className="w-1/3 border-b border-slate-100 py-4 text-sm text-slate-500">
                    {label}
                  </td>
                  <td className="border-b border-slate-100 py-4 text-sm font-medium text-[#1A1A2E]">
                    {value}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="w-1/3 border-b border-slate-100 py-4 text-sm text-slate-500">
                  Authors
                </td>
                <td className="border-b border-slate-100 py-4 text-sm font-medium text-[#1A1A2E]">
                  <div className="space-y-1">
                    {values.authors.map((author, index) => (
                      <div key={`${author.fullName}-${index}`}>
                        {author.fullName}
                        {author.orcidId ? ` (${author.orcidId})` : ''}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function SubmissionPortal({ onSubmitted }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [fieldBanner, setFieldBanner] = useState('')
  const [bannerErrors, setBannerErrors] = useState([])
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [editSubmissionId, setEditSubmissionId] = useState(null)

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(submissionSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      researchType: '',
      completionYear: currentYear,
      fundingSource: '',
      publicationVenue: '',
      authors: [{ fullName: '', orcidId: '' }],
      principalInvestigator: '',
      institutionalAffiliation: institutionName,
      abstractText: '',
      keywords: [],
      subjectDc: '',
      coverageDc: '',
      rightsDc: '',
      doi: '',
      conferenceUrl: '',
      attachment: null,
    },
  })

  const { fields: authorFields, append, remove } = useFieldArray({
    control,
    name: 'authors',
  })

  const watchedAbstract = useWatch({ control, name: 'abstractText' }) || ''
  const watchedKeywords = useWatch({ control, name: 'keywords' }) || []
  const watchedAuthors = useWatch({ control, name: 'authors' }) || []
  const watchedAttachment = useWatch({ control, name: 'attachment' }) || null
  const watchedPi = useWatch({ control, name: 'principalInvestigator' }) || ''
  const allValues = useWatch({ control })

  const authorOptions = useMemo(
    () =>
      watchedAuthors
        .map((author) => author?.fullName?.trim())
        .filter(Boolean),
    [watchedAuthors],
  )

  useEffect(() => {
    if (watchedPi && !authorOptions.includes(watchedPi)) {
      setValue('principalInvestigator', '')
    }
  }, [authorOptions, setValue, watchedPi])

  const resetWizard = () => {
    setSubmitError('')
    setFieldBanner('')
    setBannerErrors([])
    setCurrentStep(1)
    setKeywordInput('')
    reset({
      title: '',
      researchType: '',
      completionYear: currentYear,
      fundingSource: '',
      publicationVenue: '',
      authors: [{ fullName: '', orcidId: '' }],
      principalInvestigator: '',
      institutionalAffiliation: institutionName,
      abstractText: '',
      keywords: [],
      subjectDc: '',
      coverageDc: '',
      rightsDc: '',
      doi: '',
      conferenceUrl: '',
      attachment: null,
    })
  }

  useEffect(() => {
    resetWizard()
  }, [])

  useEffect(() => {
    const state = location?.state
    const maybeId = state?.editSubmissionId || null
    const maybeSubmission = state?.initialSubmission || null

    if (!maybeId && !maybeSubmission) return

    setEditSubmissionId(maybeId || maybeSubmission?.id || null)

    const mapAuthors = (value) => {
      if (!Array.isArray(value)) return [{ fullName: '', orcidId: '' }]
      const mapped = value
        .map((author) => {
          if (typeof author === 'string') {
            return { fullName: author.trim(), orcidId: '' }
          }
          return {
            fullName: (author?.fullName || author?.name || '').toString().trim(),
            orcidId: (author?.orcidId || author?.orcid || '').toString().trim(),
          }
        })
        .filter((author) => author.fullName)

      return mapped.length ? mapped : [{ fullName: '', orcidId: '' }]
    }

    const hydrateFrom = (submission) => {
      if (!submission) return
      reset({
        title: submission.title || '',
        researchType: submission.researchType || submission.type || '',
        completionYear:
          Number(submission.completionYear || submission.year || currentYear) ||
          currentYear,
        fundingSource: submission.fundingSource || '',
        publicationVenue:
          submission.publicationVenue ||
          submission.publicationVenueStatus ||
          '',
        authors: mapAuthors(submission.authors),
        principalInvestigator: submission.principalInvestigator || '',
        institutionalAffiliation:
          submission.institutionalAffiliation || institutionName,
        abstractText: submission.abstractText || submission.abstract || '',
        keywords: Array.isArray(submission.keywords) ? submission.keywords : [],
        subjectDc: submission.subjectDc || submission.sAndTTheme || '',
        coverageDc: submission.coverageDc || '',
        rightsDc: submission.rightsDc || '',
        doi: submission.doi || '',
        conferenceUrl: submission.conferenceUrl || '',
        attachment: null,
      })
      setCurrentStep(1)
      setKeywordInput('')
      setSubmitError('')
      setFieldBanner('')
    }

    if (maybeSubmission) {
      hydrateFrom(maybeSubmission)
      return
    }

    if (!maybeId) return

    const controller = new AbortController()
    const fetchDetails = async () => {
      try {
        const response = await apiClient.get(`/submissions/${maybeId}`, {
          signal: controller.signal,
        })
        hydrateFrom(response.data)
      } catch {
      }
    }

    fetchDetails()
    return () => controller.abort()
  }, [institutionName, location?.state, reset])

  const addAuthor = () => {
    append({ fullName: '', orcidId: '' })
  }

  const removeAuthor = (index) => {
    remove(index)
  }

  const addKeyword = () => {
    const value = keywordInput.trim()
    if (!value) return

    const existing = getValues('keywords')
    if (existing.includes(value)) {
      setKeywordInput('')
      return
    }
    if (existing.length >= 10) return

    setValue('keywords', [...existing, value], {
      shouldDirty: true,
      shouldValidate: true,
    })
    clearErrors('keywords')
    setKeywordInput('')
  }

  const removeKeyword = (keyword) => {
    const next = getValues('keywords').filter((item) => item !== keyword)
    setValue('keywords', next, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const handleFileSelect = (file) => {
    setValue('attachment', file, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const handleContinue = async () => {
    const step = stepDefinitions.find((item) => item.id === currentStep)
    const isValid = await trigger(step?.fields, { shouldFocus: true })
    if (!isValid) {
      const currentErrors = step?.fields
        .map((field) => {
          const err = errors[field]
          if (!err) return null
          return { field, message: err?.message || `${field} is invalid.` }
        })
        .filter(Boolean)
      setBannerErrors(currentErrors)
      return
    }
    setBannerErrors([])
    setCurrentStep((value) => Math.min(value + 1, stepDefinitions.length))
  }

  const handleFormKeyDown = (event) => {
    if (event.defaultPrevented) return
    if (event.key !== 'Enter') return

    const tag = (event.target?.tagName || '').toLowerCase()
    if (tag === 'textarea') return

    if (currentStep < stepDefinitions.length) {
      event.preventDefault()
      handleContinue()
    }
  }

  const applyBackendFieldErrors = (error) => {
    const payload = error?.response?.data
    const fieldErrors = Array.isArray(payload)
      ? payload
      : payload?.fieldErrors || payload?.errors || payload?.violations || null

    if (!Array.isArray(fieldErrors)) return false

    let mapped = false
    fieldErrors.forEach((item) => {
      const field = item?.field || item?.name || item?.path
      const message = item?.message || item?.defaultMessage || item?.error

      if (!field || !message) return

      const normalizedField = field
        .replace(/^abstract$/i, 'abstractText')
        .replace(/^sAndTTheme$/i, 'subjectDc')

      try {
        setError(normalizedField, { type: 'server', message })
        mapped = true
      } catch {
        mapped = true
      }
    })

    if (mapped) {
      setFieldBanner('Please review the highlighted fields and correct the submission details.')
      setBannerErrors(fieldErrors.map(item => ({
        field: item?.field || item?.name || item?.path || '',
        message: item?.message || item?.defaultMessage || item?.error || ''
      })).filter(e => e.message))
    }

    return mapped
  }

  const maybeUploadAttachment = async (file) => {
    if (!file) return null
    const token = await ensureFreshToken()

    try {
      const formData = new FormData()
      formData.append('file', file, file.name)

      const uploadResponse = await fetch(
        'http://localhost:8080/api/v1/submissions/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      )

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.status}`)
      }

      const data = await uploadResponse.json()
      console.log('DEBUG: Upload response data:', data);
      const fileKey = data?.objectKey || data?.fileKey || data?.s3Key
      const fileUrl = data?.uploadUrl || null

      if (!fileKey && !fileUrl) {
        throw new Error('Upload response is missing fileKey/fileUrl.')
      }

      return {
        fileName: file.name,
        fileKey: fileKey,
        fileUrl,
      }
    } catch (error) {
      console.error('DEBUG: File Upload Failed:', error)
      if (error?.response) console.error('DEBUG: Response:', error.response.data)
      throw error
    }
  }

  const submitToBackend = async (values) => {
    let attachmentMeta = null

    try {
      attachmentMeta = await maybeUploadAttachment(values.attachment)
      if (values.attachment && !attachmentMeta) {
        alert('Failed to upload attachment. Please try again.')
        throw new Error('Attachment upload failed.')
      }
    } catch (error) {
      alert('Failed to upload attachment. Please try again.')
      throw error
    }
 
    const aggregatePayload = {
      title: values.title,
      researchType: values.researchType,
      completionYear: values.completionYear,
      fundingSource: values.fundingSource,
      publicationVenue: values.publicationVenue,
      principalInvestigator: values.principalInvestigator,
      institutionalAffiliation: values.institutionalAffiliation,
      authors: values.authors,
      abstractText: values.abstractText,
      keywords: values.keywords,
      sAndTTheme: values.subjectDc,
      coverageDc: values.coverageDc,
      rightsDc: values.rightsDc,
      doi: values.doi || null,
      conferenceUrl: values.conferenceUrl || null,
      attachmentKey: attachmentMeta?.fileKey || null,
    };
 
    // Explicitly get token and add to headers
    const token = localStorage.getItem('token');
    
    // Use axios directly to be absolutely sure of the headers
    const response = await axios.post('http://localhost:8080/api/v1/submissions', aggregatePayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response;
  };

  const onFinalSubmit = async (values) => {
    setSubmitError('')
    setFieldBanner('')
    setIsFinalSubmitting(true)

    try {
      await submitToBackend(values)
      resetWizard()
      onSubmitted?.()
    } catch (error) {
      console.error('Submission error:', error)
      if (error?.response?.status === 422 && applyBackendFieldErrors(error)) {
        setSubmitError('Submission validation failed.')
      } else {
        const status = error?.response?.status
        const message = extractApiErrorMessage(
          error,
          status === 401
            ? 'Unauthorized: your session may have expired. Please sign in again.'
            : status === 403
              ? 'Forbidden: the server rejected this request (403). Your account may be missing the required permissions, or your token may be invalid/expired.'
              : 'Unable to submit the research output right now.',
        )
        setSubmitError(message)
      }
    } finally {
      setIsFinalSubmitting(false)
    }
  }

  const onFinalSubmitError = (formErrors) => {
    console.error('Zod Validation Blocked Submission:', formErrors)
    const errors = Object.entries(formErrors).map(([field, error]) => ({
      field,
      message: error?.message || `${field} is invalid.`
    }))
    setBannerErrors(errors)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep register={register} errors={errors} />
      case 2:
        return (
          <TeamAffiliationStep
            control={control}
            register={register}
            errors={errors}
            authorFields={authorFields}
            appendAuthor={addAuthor}
            removeAuthor={removeAuthor}
            authorOptions={authorOptions}
          />
        )
      case 3:
        return (
          <ResearchDetailsStep
            register={register}
            errors={errors}
            abstractText={watchedAbstract}
            keywords={watchedKeywords}
            onAddKeyword={addKeyword}
            onRemoveKeyword={removeKeyword}
            keywordInput={keywordInput}
            setKeywordInput={setKeywordInput}
          />
        )
      case 4:
        return (
          <DublinCoreMetadataStep
            control={control}
            register={register}
            errors={errors}
            attachment={watchedAttachment}
            onFileSelect={handleFileSelect}
          />
        )
      case 5:
        return <ReviewSubmitStep values={allValues} />
      default:
        return null
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="w-full border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-6 border-t-4 border-t-[#C9A84C] border-b border-slate-200 px-8 py-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DASHBOARD &gt; <span className="text-[#C9A84C]">SUBMISSION PORTAL</span>
            </p>
            <h2 className="mt-2 text-3xl font-serif text-[#1A1A2E]">
              Submission Portal
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Submit research outputs through the standardized DOST form
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ACADEMIC YEAR
            </p>
            <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
            <p className="text-xs text-slate-500">{institutionName}</p>
          </div>
        </div>

        <div className="px-8 py-6">
          <StepProgress currentStep={currentStep} />

          {submitError ? (
            <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <div
            onKeyDown={handleFormKeyDown}
            className="mt-6 flex w-full flex-col space-y-6"
          >
            {renderStep()}
          </div>
        </div>

        {bannerErrors.length > 0 ? (
          <div className="px-8">
            <ErrorSummaryBanner
              errors={bannerErrors}
              onDismiss={() => setBannerErrors([])}
            />
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 px-8 pb-6 pt-4">
          <button
            type="button"
            onClick={() => setCurrentStep((value) => Math.max(1, value - 1))}
            disabled={currentStep === 1 || isFinalSubmitting}
            className="rounded-md border border-slate-200 bg-white px-6 py-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {currentStep < stepDefinitions.length ? (
            <button
              type="button"
              onClick={handleContinue}
              className="flex items-center gap-2 rounded-md bg-[#1A1A2E] px-6 py-2 text-white transition hover:bg-[#11111f]"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onFinalSubmit, onFinalSubmitError)}
              disabled={isFinalSubmitting}
              className="flex items-center gap-2 rounded-md bg-[#1A1A2E] px-6 py-2 text-white transition hover:bg-[#11111f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isFinalSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
