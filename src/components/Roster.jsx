import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { FiSearch, FiUserPlus, FiFilter, FiEdit3, FiTrash2, FiAward, FiActivity, FiUsers, FiTv} from 'react-icons/fi'
import { BsGenderAmbiguous } from "react-icons/bs";
import './Roster.css'

const RELATIONSHIP_TYPES = [
  'Ally',
  'Rival',
  'Former Partner',
  'Mentor',
  'Student',
  'Family',
  'Respect',
  'Betrayed',
  'Owes Favor',
  'Unfinished Business',
]

function getRelationshipPhrase(type) {
  if (type === 'Ally') return 'allied with'
  if (type === 'Rival') return 'rival of'
  if (type === 'Former Partner') return 'former partner of'
  if (type === 'Mentor') return 'mentor of'
  if (type === 'Student') return 'student of'
  if (type === 'Family') return 'family with'
  if (type === 'Respect') return 'respects'
  if (type === 'Betrayed') return 'betrayed'
  if (type === 'Owes Favor') return 'owes a favor to'
  if (type === 'Unfinished Business') return 'has unfinished business with'
  return 'connected to'
}

function getRelationshipKey(relationship) {
  const directionalTypes = ['Mentor', 'Student', 'Betrayed', 'Owes Favor']
  const ids = directionalTypes.includes(relationship?.type)
    ? [...(relationship?.wrestlerIds || [])].join(':')
    : [...(relationship?.wrestlerIds || [])].sort((a, b) => a - b).join(':')
  return `${ids}:${relationship?.type || 'Rival'}`
}

export default function Roster({
  state,
  addWrestler,
  editWrestler,
  deleteWrestler,
  addRelationship,
  editRelationship,
  deleteRelationship,
  showToast,
}) {
  const { wrestlers, shows, titles, relationships = [] } = state
  const [modal, setModal] = useState(null)
  const [modalRole, setModalRole] = useState('wrestler')
  const [relationshipModal, setRelationshipModal] = useState(null)
  const [showAllRoster, setShowAllRoster] = useState(false)
  const [showAllRelationships, setShowAllRelationships] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    show: 'all',
    align: 'all',
    gender: 'all',
    status: 'all',
  })
  const [relationshipFilters, setRelationshipFilters] = useState({
    wrestler: 'all',
    type: 'all',
    intensity: 'all',
    search: '',
  })

  const getShow = (name) => shows.find((s) => s.name === name)
  const getWrestler = (id) => wrestlers.find((wrestler) => wrestler.id === id)
  const getChampIds = (title) => (Array.isArray(title.champIds) && title.champIds.length > 0 ? title.champIds : (title.champId ? [title.champId] : []))
  const getBrandColor = (showName) => getShow(showName)?.color || 'var(--primary)'
  
  const getTitleBadgeLabel = (title) => {
    const titleName = title?.name?.trim() || ''
    const showName = title?.show?.trim() || ''
    if (showName && titleName.toLowerCase().startsWith(`${showName.toLowerCase()} `)) {
      return titleName.slice(showName.length).trim()
    }
    return titleName
  }

  const filteredWrestlers = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return wrestlers
      .filter((wrestler) => {
        if (search && !wrestler.name.toLowerCase().includes(search)) return false
        if (filters.show !== 'all' && (wrestler.show || '') !== filters.show) return false
        if (filters.align !== 'all' && (wrestler.align || '') !== filters.align) return false
        if (filters.gender !== 'all' && (wrestler.gender || '') !== filters.gender) return false
        if (filters.status !== 'all' && (wrestler.status || '') !== filters.status) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filters, wrestlers])
  const visibleWrestlers = showAllRoster ? filteredWrestlers : filteredWrestlers.slice(0, 10)
  const filteredRelationships = useMemo(() => {
    const search = relationshipFilters.search.trim().toLowerCase()
    return relationships
      .filter((relationship) => {
        const wrestlerIds = relationship.wrestlerIds || []
        if (relationshipFilters.wrestler !== 'all' && !wrestlerIds.includes(parseInt(relationshipFilters.wrestler, 10))) return false
        if (relationshipFilters.type !== 'all' && relationship.type !== relationshipFilters.type) return false
        if (relationshipFilters.intensity !== 'all' && String(relationship.intensity) !== relationshipFilters.intensity) return false
        if (search) {
          const names = wrestlerIds.map((id) => getWrestler(id)?.name || '').join(' ').toLowerCase()
          const haystack = `${names} ${relationship.type || ''} ${relationship.note || ''}`.toLowerCase()
          if (!haystack.includes(search)) return false
        }
        return true
      })
      .sort((a, b) => (b.intensity || 0) - (a.intensity || 0))
  }, [relationships, relationshipFilters, wrestlers])
  const visibleRelationships = showAllRelationships ? filteredRelationships : filteredRelationships.slice(0, 10)

  const handleSave = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      name: fd.get('name').trim(),
      role: fd.get('role') || 'wrestler',
      show: fd.get('show'),
      align: fd.get('align'),
      gender: fd.get('gender'),
      status: fd.get('status'),
    }

    if (!data.name) {
      showToast('Enter a name')
      return
    }

    if (modal === 'add') {
      addWrestler(data)
      showToast(`${data.name} added to roster!`)
    } else {
      editWrestler(modal.id, {
        ...data,
        wins: data.role === 'wrestler' ? (parseInt(fd.get('wins')) || 0) : 0,
        losses: data.role === 'wrestler' ? (parseInt(fd.get('losses')) || 0) : 0,
      })
      showToast('Roster entry updated!')
    }

    setModal(null)
    setModalRole('wrestler')
  }

  const getAlignClass = (a) => (a === 'Face' ? 'badge-face' : a === 'Heel' ? 'badge-heel' : 'badge-neutral')
  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const updateRelationshipFilter = (key, value) => {
    setRelationshipFilters((prev) => ({ ...prev, [key]: value }))
    setShowAllRelationships(false)
  }
  const resetFilters = () => {
    setFilters({ search: '', show: 'all', align: 'all', gender: 'all', status: 'all' })
    setShowAllRoster(false)
  }
  const resetRelationshipFilters = () => {
    setRelationshipFilters({ wrestler: 'all', type: 'all', intensity: 'all', search: '' })
    setShowAllRelationships(false)
  }

  const handleSaveRelationship = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const wrestlerIds = [parseInt(fd.get('wrestlerA'), 10), parseInt(fd.get('wrestlerB'), 10)].filter(Boolean)
    const data = {
      wrestlerIds,
      type: fd.get('type'),
      intensity: parseInt(fd.get('intensity'), 10) || 3,
      note: fd.get('note')?.trim() || '',
    }

    if (wrestlerIds.length !== 2 || wrestlerIds[0] === wrestlerIds[1]) {
      showToast('Choose two different wrestlers')
      return
    }
    const duplicate = relationships.some((relationship) => {
      if (relationshipModal?.id && relationship.id === relationshipModal.id) return false
      return getRelationshipKey(relationship) === getRelationshipKey(data)
    })
    if (duplicate) {
      showToast('That relationship already exists')
      return
    }

    if (relationshipModal?.id) {
      editRelationship(relationshipModal.id, data)
      showToast('Relationship updated')
    } else {
      addRelationship(data)
      showToast('Relationship added')
    }
    setRelationshipModal(null)
  }

  return (
    <div className="roster-page">
      <div className="page-header">
        <h1 className="page-title">Roster Management</h1>
        <button className="btn btn-primary" onClick={() => { setModal('add'); setModalRole('wrestler') }}>
          <FiUserPlus /> Add Talent
        </button>
      </div>

      <div className="filters-card">
        <div className="filters-grid">
          <div className="form-group">
            <label><FiSearch /> Search</label>
            <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Name..." />
          </div>
          <div className="form-group">
            <label><FiTv /> Brand</label>
            <select value={filters.show} onChange={(e) => updateFilter('show', e.target.value)}>
              <option value="all">All Brands</option>
              <option value="">No Brand</option>
              {shows.map((show) => (
                <option key={show.id} value={show.name}>{show.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label><FiUsers /> Alignment</label>
            <select value={filters.align} onChange={(e) => updateFilter('align', e.target.value)}>
              <option value="all">All Side</option>
              <option value="Face">Face</option>
              <option value="Heel">Heel</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
          <div className="form-group">
            <label><BsGenderAmbiguous /> Gender</label>
            <select value={filters.gender} onChange={(e) => updateFilter('gender', e.target.value)}>
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label><FiActivity /> Status</label>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Injured">Injured</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
        </div>
        <div className="filters-footer">
          <div className="filters-count">{filteredWrestlers.length} TALENT{filteredWrestlers.length !== 1 ? 'S' : ''} ACTIVE</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </div>

      <div className="roster-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Talent</th>
                <th>Role</th>
                <th>Brand</th>
                <th>Alignment</th>
                <th>Record</th>
                <th>Status</th>
                <th>Championships</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredWrestlers.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state" style={{ padding: '48px 0' }}>
                    <FiSearch style={{ fontSize: 32, opacity: 0.1, marginBottom: 12 }} />
                    <p>No roster entries match your filters.</p>
                  </td>
                </tr>
              )}
              {visibleWrestlers.map((w) => {
                const sh = getShow(w.show)
                const champs = titles.filter((t) => getChampIds(t).includes(w.id))
                const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2)

                return (
                  <tr key={w.id}>
                    <td>
                      <div className="wrestler-cell">
                        <div className="wrestler-avatar">{initials}</div>
                        <div className="wrestler-info">
                          <span className="wrestler-name">{w.name}</span>
                          <span className="wrestler-sub">{w.gender}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${w.role === 'manager' ? 'badge-gold' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {w.role === 'manager' ? 'Manager' : 'Wrestler'}
                      </span>
                    </td>
                    <td>
                      {sh ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="show-dot" style={{ background: sh.color, boxShadow: `0 0 8px ${sh.color}66` }} />
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{w.show}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text3)' }}>Freelancer</span>}
                    </td>
                    <td>
                      <span className={`badge-pro ${getAlignClass(w.align)}`}>{w.align}</span>
                    </td>
                    <td>
                      {w.role !== 'manager' ? (
                        <div className="record-pill">
                          <span className="record-win">{w.wins || 0}W</span>
                          <span style={{ margin: '0 4px', opacity: 0.3 }}>-</span>
                          <span className="record-loss">{w.losses || 0}L</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: 12, 
                        fontWeight: 700, 
                        color: w.status === 'Active' ? 'var(--green)' : w.status === 'Injured' ? 'var(--red)' : 'var(--text3)' 
                      }}>
                        {w.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {champs.map((t) => (
                          <span
                            key={t.id}
                            className="roster-title-badge"
                            style={{
                              background: `${getBrandColor(t.show)}15`,
                              color: getBrandColor(t.show),
                              border: `1px solid ${getBrandColor(t.show)}33`,
                            }}
                          >
                            <FiAward style={{ marginRight: 4 }} /> {getTitleBadgeLabel(t)}
                          </span>
                        ))}
                        {champs.length === 0 && <span style={{ opacity: 0.2 }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setModal({ id: w.id }); setModalRole(w.role || 'wrestler') }} title="Edit Talent">
                          <FiEdit3 />
                        </button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => { deleteWrestler(w.id); showToast('Talent removed') }} title="Delete Talent">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredWrestlers.length > 10 && (
          <div className="roster-table-footer">
            <span>
              Showing {visibleWrestlers.length} of {filteredWrestlers.length} talent{filteredWrestlers.length !== 1 ? 's' : ''}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAllRoster((value) => !value)}>
              {showAllRoster ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}
      </div>

      <section className="relationships-card">
        <div className="relationships-header">
          <div>
            <h2 className="section-title">Relationships</h2>
            <p>Track rivalries, allies, former partners, and unfinished business for future HeatSpark ideas.</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => setRelationshipModal('add')}>
            Add Relationship
          </button>
        </div>

        <div className="relationship-filters">
          <div className="form-group">
            <label><FiSearch /> Search</label>
            <input value={relationshipFilters.search} onChange={(e) => updateRelationshipFilter('search', e.target.value)} placeholder="Name, note, type..." />
          </div>
          <div className="form-group">
            <label>Wrestler</label>
            <select value={relationshipFilters.wrestler} onChange={(e) => updateRelationshipFilter('wrestler', e.target.value)}>
              <option value="all">All Wrestlers</option>
              {wrestlers
                .filter((wrestler) => (wrestler.role || 'wrestler') === 'wrestler')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((wrestler) => <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={relationshipFilters.type} onChange={(e) => updateRelationshipFilter('type', e.target.value)}>
              <option value="all">All Types</option>
              {RELATIONSHIP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Intensity</label>
            <select value={relationshipFilters.intensity} onChange={(e) => updateRelationshipFilter('intensity', e.target.value)}>
              <option value="all">All Intensities</option>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
            </select>
          </div>
        </div>
        <div className="relationship-filter-footer">
          <span>{filteredRelationships.length} relationship{filteredRelationships.length !== 1 ? 's' : ''} shown</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetRelationshipFilters}>Reset Filters</button>
        </div>

        {relationships.length === 0 ? (
          <div className="relationship-empty">No relationships yet. Add a connection to give the universe more memory.</div>
        ) : filteredRelationships.length === 0 ? (
          <div className="relationship-empty">No relationships match your filters.</div>
        ) : (
          <div className="relationship-grid">
            {visibleRelationships.map((relationship) => {
              const [firstId, secondId] = relationship.wrestlerIds || []
              const first = getWrestler(firstId)
              const second = getWrestler(secondId)
              return (
                <div key={relationship.id} className="relationship-card">
                  <div className="relationship-card-top">
                    <span className="relationship-type">{relationship.type}</span>
                    <span className="relationship-intensity">Intensity {relationship.intensity}/5</span>
                  </div>
                  <div className="relationship-names">
                    {first?.name || 'Unknown'} <span>{getRelationshipPhrase(relationship.type)}</span> {second?.name || 'Unknown'}
                  </div>
                  {relationship.note && <div className="relationship-note">{relationship.note}</div>}
                  <div className="relationship-actions">
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setRelationshipModal({ id: relationship.id })}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => { deleteRelationship(relationship.id); showToast('Relationship removed') }}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {filteredRelationships.length > 10 && (
          <div className="relationship-table-footer">
            <span>
              Showing {visibleRelationships.length} of {filteredRelationships.length} relationship{filteredRelationships.length !== 1 ? 's' : ''}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAllRelationships((value) => !value)}>
              {showAllRelationships ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}
      </section>

      {modal && (
        <Modal 
          title={modal === 'add' ? 'Add Roster Entry' : `Edit ${wrestlers.find(x => x.id === modal.id)?.name}`} 
          onClose={() => { setModal(null); setModalRole('wrestler') }}
        >
          <form onSubmit={handleSave}>
            {(() => {
              const w = modal !== 'add' ? wrestlers.find((x) => x.id === modal.id) : null
              const selectedRole = modalRole || w?.role || 'wrestler'

              return (
                <div style={{ minWidth: '400px' }}>
                  <div className="form-group">
                    <label>Talent Name</label>
                    <input name="name" defaultValue={w?.name ?? ''} placeholder="e.g. John Doe" autoFocus />
                  </div>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Contract Role</label>
                      <select name="role" value={selectedRole} onChange={(e) => setModalRole(e.target.value)}>
                        <option value="wrestler">Wrestler</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Assigned Brand</label>
                      <select name="show" defaultValue={w?.show ?? ''}>
                        <option value="">Freelance / No Brand</option>
                        {shows.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Alignment</label>
                      <select name="align" defaultValue={w?.align ?? 'Face'}>
                        <option>Face</option>
                        <option>Heel</option>
                        <option>Neutral</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select name="gender" defaultValue={w?.gender ?? 'Male'}>
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Medical Status</label>
                      <select name="status" defaultValue={w?.status ?? 'Active'}>
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Injured</option>
                        <option>Retired</option>
                      </select>
                    </div>
                  </div>
                  {w && selectedRole === 'wrestler' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: 'var(--bg3)', borderRadius: 8, marginBottom: 20 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Wins</label>
                        <input name="wins" type="number" defaultValue={w.wins} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Losses</label>
                        <input name="losses" type="number" defaultValue={w.losses} />
                      </div>
                    </div>
                  )}
                  <div className="form-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setModalRole('wrestler') }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {modal === 'add' ? 'Confirm Addition' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )
            })()}
          </form>
        </Modal>
      )}

      {relationshipModal && (
        <Modal
          title={relationshipModal === 'add' ? 'Add Relationship' : 'Edit Relationship'}
          onClose={() => setRelationshipModal(null)}
        >
          {(() => {
            const relationship = relationshipModal !== 'add'
              ? relationships.find((item) => item.id === relationshipModal.id)
              : null
            const competitiveWrestlers = wrestlers.filter((wrestler) => (wrestler.role || 'wrestler') === 'wrestler')
            const firstDefault = relationship?.wrestlerIds?.[0] || competitiveWrestlers[0]?.id || ''
            const secondDefault = relationship?.wrestlerIds?.[1] || competitiveWrestlers.find((wrestler) => wrestler.id !== firstDefault)?.id || ''

            return (
              <form onSubmit={handleSaveRelationship}>
                <div className="relationship-form">
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Wrestler A</label>
                      <select name="wrestlerA" defaultValue={firstDefault}>
                        {competitiveWrestlers.map((wrestler) => (
                          <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Wrestler B</label>
                      <select name="wrestlerB" defaultValue={secondDefault}>
                        {competitiveWrestlers.map((wrestler) => (
                          <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16 }}>
                    <div className="form-group">
                      <label>Relationship Type</label>
                      <select name="type" defaultValue={relationship?.type || 'Rival'}>
                        {RELATIONSHIP_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Intensity</label>
                      <select name="intensity" defaultValue={relationship?.intensity || 3}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>{value}/5</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Note</label>
                    <textarea name="note" rows={3} defaultValue={relationship?.note || ''} placeholder="What history do they share?" />
                  </div>
                  <div className="form-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setRelationshipModal(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {relationship ? 'Save Relationship' : 'Add Relationship'}
                    </button>
                  </div>
                </div>
              </form>
            )
          })()}
        </Modal>
      )}
    </div>
  )
}
