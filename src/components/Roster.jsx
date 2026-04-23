import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { FiSearch, FiUserPlus, FiFilter, FiEdit3, FiTrash2, FiAward, FiActivity, FiUsers, FiTv} from 'react-icons/fi'
import { BsGenderAmbiguous } from "react-icons/bs";
import './Roster.css'

export default function Roster({ state, addWrestler, editWrestler, deleteWrestler, showToast }) {
  const { wrestlers, shows, titles } = state
  const [modal, setModal] = useState(null)
  const [modalRole, setModalRole] = useState('wrestler')
  const [filters, setFilters] = useState({
    search: '',
    show: 'all',
    align: 'all',
    gender: 'all',
    status: 'all',
  })

  const getShow = (name) => shows.find((s) => s.name === name)
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
  const resetFilters = () => setFilters({ search: '', show: 'all', align: 'all', gender: 'all', status: 'all' })

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
              {filteredWrestlers.map((w) => {
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
      </div>

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
    </div>
  )
}
