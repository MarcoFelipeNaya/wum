import { useCallback, useEffect, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ msg: '', show: false })
  const timer = useRef(null)

  const showToast = useCallback((msg) => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ msg, show: true })
    timer.current = setTimeout(() => setToast((currentToast) => ({ ...currentToast, show: false })), 2500)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return { toast, showToast }
}
