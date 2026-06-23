export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
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
