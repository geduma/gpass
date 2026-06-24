import { useEffect } from 'react'

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="modal-overlay">
      <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <div className="detail-footer-left">
            <button className="btn btn-danger" onClick={onConfirm}>
              Confirm
            </button>
          </div>
          <button className="btn btn-secondary detail-footer-close" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
