import React, { useCallback, useEffect } from 'react'

export default function Modal({ title, onClose, children, style }) {
  const handleOverlayClick = useCallback((event) => {
    if (event.target === event.currentTarget) onClose()
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal" style={style}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
