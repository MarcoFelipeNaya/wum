import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
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

  const alignBadge = (a) => (a === 'Face' ? 'badge-green' : a === 'Heel' ? 'badge-red' : 'badge-gray')
  const roleBadge = (role) => (role === 'manager' ? 'badge-gold' : 'badge-gray')
  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const resetFilters = () => setFilters({ search: '', show: 'all', align: 'all', gender: 'all', status: 'all' })

  return (
    <div className="roster-page">
      <div
        className="page-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}
      >
        <h1 className="page-title">Roster</h1>
        <button className="btn btn-primary" onClick={() => { setModal('add'); setModalRole('wrestler') }}>
          + Add Person
        </button>
      </div>

      <div className="filters-card card">
        <div className="filters-grid">
          <div className="form-group">
            <label>Search</label>
            <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Search roster" />
          </div>
          <div className="form-group">
            <label>Show</label>
            <select value={filters.show} onChange={(e) => updateFilter('show', e.target.value)}>
              <option value="all">All shows</option>
              <option value="">No show</option>
              {shows.map((show) => (
                <option key={show.id} value={show.name}>{show.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Alignment</label>
            <select value={filters.align} onChange={(e) => updateFilter('align', e.target.value)}>
              <option value="all">All alignments</option>
              <option value="Face">Face</option>
              <option value="Heel">Heel</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select value={filters.gender} onChange={(e) => updateFilter('gender', e.target.value)}>
              <option value="all">All genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Injured">Injured</option>
              <option value="Deceased">Deceased</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
        </div>
        <div className="filters-footer">
          <div className="filters-count">{filteredWrestlers.length} wrestler{filteredWrestlers.length !== 1 ? 's' : ''} shown</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Show</th>
                <th>Alignment</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Titles</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredWrestlers.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No wrestlers match the current filters.
                  </td>
                </tr>
              )}
              {filteredWrestlers.map((w) => {
                const sh = getShow(w.show)
                const champs = titles.filter((t) => getChampIds(t).includes(w.id))

                return (
                  <tr key={w.id}>
                    <td className="wrestler-name">{w.name}</td>
                    <td>
                      <span className={`badge ${roleBadge(w.role)}`}>{w.role === 'manager' ? 'Manager' : 'Wrestler'}</span>
                    </td>
                    <td>
                      {sh && <span className="show-dot" style={{ background: sh.color }} />}
                      {w.show || '-'}
                    </td>
                    <td>
                      <span className={`badge ${alignBadge(w.align)}`}>{w.align}</span>
                    </td>
                    <td>{w.gender || '-'}</td>
                    <td>{w.status || '-'}</td>
                    <td>
                      {champs.length > 0
                        ? champs.map((t) => (
                            <span
                              key={t.id}
                              className="badge roster-title-badge"
                              style={{
                                marginRight: 4,
                                background: `${getBrandColor(t.show)}22`,
                                color: getBrandColor(t.show),
                                border: `1px solid ${getBrandColor(t.show)}55`,
                                boxShadow: 'none',
                              }}
                            >
                              {getTitleBadgeLabel(t)}
                            </span>
                          ))
                        : '-'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setModal({ id: w.id }); setModalRole(w.role || 'wrestler') }}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ marginLeft: 6 }}
                        onClick={() => {
                          deleteWrestler(w.id)
                          showToast('Wrestler removed')
                        }}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Roster Entry' : 'Edit Roster Entry'} onClose={() => { setModal(null); setModalRole('wrestler') }}>
          <form onSubmit={handleSave}>
            {(() => {
              const w = modal !== 'add' ? wrestlers.find((x) => x.id === modal.id) : null
              const selectedRole = modalRole || w?.role || 'wrestler'

              return (
                <>
                  <div className="form-group">
                    <label>Name</label>
                    <input name="name" defaultValue={w?.name ?? ''} placeholder={selectedRole === 'manager' ? 'Manager name' : 'Wrestler name'} autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={selectedRole} onChange={(e) => setModalRole(e.target.value)}>
                      <option value="wrestler">Wrestler</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Show</label>
                    <select name="show" defaultValue={w?.show ?? ''}>
                      <option value="">No show</option>
                      {shows.map((s) => (
                        <option key={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
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
                    <label>Status</label>
                    <select name="status" defaultValue={w?.status ?? 'Active'}>
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Injured</option>
                      <option>Deceased</option>
                      <option>Retired</option>
                    </select>
                  </div>
                  {w && selectedRole === 'wrestler' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Wins</label>
                        <input name="wins" type="number" defaultValue={w.wins} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Losses</label>
                        <input name="losses" type="number" defaultValue={w.losses} />
                      </div>
                    </div>
                  )}
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setModalRole('wrestler') }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {modal === 'add' ? 'Add' : 'Save'}
                    </button>
                  </div>
                </>
              )
            })()}
          </form>
        </Modal>
      )}
    </div>
  )
}
