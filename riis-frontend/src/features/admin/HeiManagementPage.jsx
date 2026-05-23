import { useEffect, useState } from 'react'
import DashboardLayout from './DashboardLayout'
import { dostNavItems } from './PendingSubmissionsPage'
import apiClient from '../../services/apiClient'

const fetchInstitutions = async () => {
  const { data } = await apiClient.get('/admin/institutions')
  return Array.isArray(data) ? data : (data?.content ?? [])
}

const postInstitution = async (payload) => {
  const { data } = await apiClient.post('/admin/institutions', payload)
  return data
}

const patchInstitutionStatus = async (id, status) => {
  const { data } = await apiClient.patch(`/admin/institutions/${id}/status`, { status })
  return data
}


const TYPES = ['SUC', 'Private', 'LUC']
const PROVINCES = [
  'Cebu', 'Bohol'
]
const STATUSES = ['ACTIVE', 'INACTIVE']

const TYPE_COLORS = {
  SUC:     { bg: '#dbeafe', color: '#1d4ed8' },
  Private: { bg: '#fef9c3', color: '#a16207' },
  LUC:     { bg: '#fce7f3', color: '#be185d' },
}


const getTypeBadge = (type) => {
  const t = TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      background: t.bg, color: t.color,
      borderRadius: 6, padding: '2px 10px',
      fontSize: 12, fontWeight: 700,
    }}>{type}</span>
  )
}

const getStatusBadge = (status) => {
  const active = status?.toUpperCase() === 'ACTIVE'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      color: active ? '#15803d' : '#6b7280', fontSize: 13, fontWeight: 500,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: active ? '#22c55e' : '#9ca3af',
        display: 'inline-block',
      }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}


function RegisterHEIModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', type: '', province: '', emailDomain: '', status: 'ACTIVE',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(null)

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())     e.name = 'Institution name is required.'
    if (!form.type)            e.type = 'Institution type is required.'
    if (!form.province)        e.province = 'Province is required.'
    if (!form.emailDomain.trim()) e.emailDomain = 'Email domain is required.'
    else if (!/^@[a-z0-9.-]+\.[a-z]{2,}$/.test(form.emailDomain.trim().toLowerCase()))
      e.emailDomain = 'Must be in format @domain.edu.ph'
    if (!form.status)          e.status = 'Status is required.'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSubmitting(true)
    try {
      const result = await postInstitution({
        name:        form.name.trim(),
        type:        form.type,
        province:    form.province,
        emailDomain: form.emailDomain.trim().toLowerCase(),
        status:      form.status,
      })
      setSaved(result)
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || 'Unable to save institution.'
      if (status === 409) setErrors({ emailDomain: 'This email domain is already registered.' })
      else if (status === 422) setErrors({ emailDomain: 'Invalid email domain format.' })
      else setErrors({ _global: msg })
    } finally {
      setSubmitting(false)
    }
  }

 
  if (saved) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 56px', maxWidth: 600, width: '90%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', background: '#f0fdf4' }}>
            <span style={{ fontSize: 32, color: '#16a34a' }}>✓</span>
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#111827' }}>Institution Successfully Whitelisted</h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
            The institution has been added to the DASIG HEI whitelist with status{' '}
            <strong style={{ color: '#16a34a' }}>Active</strong>.{' '}
            Staff with a matching institutional email domain can now register DASIG accounts.
          </p>
          <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 28, textAlign: 'left' }}>
            {[
              ['INSTITUTION NAME',  saved.name],
              ['INSTITUTION TYPE',  saved.type ? `${saved.type} — ${saved.type === 'SUC' ? 'State University or College' : saved.type === 'LUC' ? 'Local University or College' : 'Private Higher Education Institution'}` : '—'],
              ['PROVINCE',         saved.province],
              ['EMAIL DOMAIN',     saved.emailDomain],
              ['STATUS',           saved.whitelistStatus || saved.status || 'ACTIVE'],
              ['STAFF REGISTRATION', 'Now accepting registrations'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
                <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontWeight: 600, color: label === 'STATUS' || label === 'STAFF REGISTRATION' ? '#16a34a' : '#111827' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { onSuccess(); onClose() }} style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#374151' }}>
              Back to HEI Management
            </button>
            <button onClick={() => setSaved(null)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1e3a5f', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              + Add Another HEI
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = (hasErr) => ({
    width: '100%', padding: '10px 12px', border: `1.5px solid ${hasErr ? '#fca5a5' : '#e5e7eb'}`,
    borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    background: '#fff',
  })

  const selectStyle = (hasErr) => ({ ...inputStyle(hasErr), appearance: 'none', cursor: 'pointer' })

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6,
  }

  const errStyle = { fontSize: 12, color: '#dc2626', marginTop: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, boxShadow: '0 8px 40px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#1e3a5f', padding: '20px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            UC-M10-02 · STEP 3-5
          </div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Institution Details</h3>
        </div>

        {/* Info banner */}
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '12px 28px', fontSize: 13, color: '#1d4ed8' }}>
          <strong>Only institutions sourced from the CHED PhilGovt Database</strong> should be added to the whitelist.
          Verify the institution's official email domain before saving.
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px 28px' }}>
          {errors._global && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              {errors._global}
            </div>
          )}

          {/* Institution Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Institution Name <span style={{ color: '#dc2626' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Cebu Normal University"
                style={inputStyle(errors.name)}
              />
            </div>
            {errors.name && <div style={errStyle}>{errors.name}</div>}
          </div>

          {/* Type + Province */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Institution Type <span style={{ color: '#dc2626' }}>*</span></label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={selectStyle(errors.type)}>
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <div style={errStyle}>{errors.type}</div>}
            </div>
            <div>
              <label style={labelStyle}>Province <span style={{ color: '#dc2626' }}>*</span></label>
              <select value={form.province} onChange={e => set('province', e.target.value)} style={selectStyle(errors.province)}>
                <option value="">Select province</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.province && <div style={errStyle}>{errors.province}</div>}
            </div>
          </div>

          {/* Email Domain + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Email Domain <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                value={form.emailDomain}
                onChange={e => set('emailDomain', e.target.value)}
                placeholder="@university.edu.ph"
                style={inputStyle(errors.emailDomain)}
              />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Must match the institution's official domain.
              </div>
              {errors.emailDomain && <div style={errStyle}>{errors.emailDomain}</div>}
            </div>
            <div>
              <label style={labelStyle}>Status <span style={{ color: '#dc2626' }}>*</span></label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle(errors.status)}>
                <option value="">Select status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Set to Active to allow staff registration immediately.
              </div>
              {errors.status && <div style={errStyle}>{errors.status}</div>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Saving…' : 'Save & Add to Whitelist »'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function HeiManagementPage() {
  const [institutions, setInstitutions] = useState([])
  const [isLoading, setIsLoading]       = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editingId, setEditingId]       = useState(null)

  // Filters
  const [filterType,     setFilterType]     = useState('')
  const [filterProvince, setFilterProvince] = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [search,         setSearch]         = useState('')

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await fetchInstitutions()
      setInstitutions(data)
    } catch (err) {
      console.error('[HEIManagementPage] Failed to fetch institutions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggleStatus = async (inst) => {
    const next = inst.whitelistStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setEditingId(inst.id)
    try {
      await patchInstitutionStatus(inst.id, next)
      await load()
    } catch (err) {
      console.error('[HEIManagementPage] Status update failed:', err)
    } finally {
      setEditingId(null)
    }
  }


  const total   = institutions.length
  const sucCount  = institutions.filter(i => i.type?.toUpperCase() === 'SUC').length
  const privCount = institutions.filter(i => i.type?.toUpperCase() === 'PRIVATE').length
  const lucCount  = institutions.filter(i => i.type?.toUpperCase() === 'LUC').length

  
  const filtered = institutions.filter(i => {
    const matchType     = !filterType     || i.type?.toUpperCase() === filterType.toUpperCase()
    const matchProvince = !filterProvince || i.province?.toLowerCase() === filterProvince.toLowerCase()
    const matchStatus   = !filterStatus   || i.whitelistStatus?.toUpperCase() === filterStatus.toUpperCase()
    const matchSearch   = !search         || i.name?.toLowerCase().includes(search.toLowerCase())
    return matchType && matchProvince && matchStatus && matchSearch
  })

  const statCards = [
    { value: total,    label: 'Total HEIs',    sublabel: 'All whitelisted institutions', color: '#1e3a5f' },
    { value: sucCount, label: 'SUCs',          sublabel: 'State universities & colleges', color: '#1d4ed8' },
    { value: privCount,label: 'Private HEIs',  sublabel: 'Private institutions',         color: '#374151' },
    { value: lucCount, label: 'LUCs',          sublabel: 'Local universities & colleges', color: '#b45309' },
  ]

  return (
    <DashboardLayout navItems={dostNavItems} userName="DOST Administrator" organization="DOST Region VII">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Dashboard &nbsp;|&nbsp; HEI Management
          </p>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111827' }}>HEI Management</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Manage the registered HEI whitelist for DASIG
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Academic Year</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>2025 – 2026</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>DOST Region VII</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, marginTop: 20 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ flex: 1, borderLeft: `4px solid ${s.color}`, background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{isLoading ? '…' : s.value}</div>
            <div style={{ fontWeight: 700, color: '#111827', marginTop: 4, fontSize: 14 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Table section */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              HEI Whitelist — Region VII Central Visayas
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            + Add HEI to Whitelist
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Filter by</span>
          {[
            { label: 'All Types',    value: filterType,     setter: setFilterType,     options: TYPES },
            { label: 'All Provinces',value: filterProvince, setter: setFilterProvince, options: PROVINCES },
            { label: 'All Statuses', value: filterStatus,   setter: setFilterStatus,   options: STATUSES },
          ].map(({ label, value, setter, options }) => (
            <select
              key={label}
              value={value}
              onChange={e => setter(e.target.value)}
              style={{ padding: '6px 28px 6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', appearance: 'none' }}
            >
              <option value="">{label}</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type of institution name"
              style={{ padding: '7px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: 220, outline: 'none' }}
            />
          </div>
        </div>

        {/* Sub-header */}
        <div style={{ padding: '14px 24px 10px', borderBottom: '1px solid #f9fafb' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Whitelisted Institutions</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Institutions eligible to use R.V. 2025-2026</div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading institutions…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No institutions found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['#', 'Institution Name', 'Type', 'Province', 'Email Domain', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: h === '#' ? 'center' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst, idx) => (
                <tr key={inst.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 14, color: '#111827' }}>{inst.name}</td>
                  <td style={{ padding: '14px 16px' }}>{getTypeBadge(inst.type)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#374151' }}>{inst.province}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{inst.emailDomain}</td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(inst.whitelistStatus)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => handleToggleStatus(inst)}
                      disabled={editingId === inst.id}
                      style={{
                        padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
                      }}
                    >
                      {editingId === inst.id ? '…' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>
            Showing {filtered.length} of {total} institutions
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <RegisterHEIModal
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </DashboardLayout>
  )
}