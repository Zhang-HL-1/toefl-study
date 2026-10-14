import { Link } from "react-router-dom"

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="empty">
      <h1>{title}</h1>
      <p>{body}</p>
      {action ? (
        <Link className="btn btn-primary" to={action.to}>
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
