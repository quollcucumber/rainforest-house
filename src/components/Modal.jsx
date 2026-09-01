export default function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
