import React, { useEffect } from 'react'

export default function Modal({ title, onClose, children, style }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal" style={style}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}