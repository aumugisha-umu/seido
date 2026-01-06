import {
  Bell,
  User,
  Check,
  Info,
  Clock,
  Activity,
  FileText,
  MessageSquare,
  AlertTriangle,
  Wrench,
} from "lucide-react"
import { createElement } from "react"

/**
 * Returns the appropriate icon component for a notification type
 * @param type - The notification type (intervention, assignment, document, etc.)
 * @returns A Lucide React icon element
 */
export function getNotificationIcon(type: string) {
  const className = "h-5 w-5 text-primary"

  switch (type) {
    case "intervention":
      return createElement(Wrench, { className })
    case "assignment":
      return createElement(User, { className })
    case "payment":
      return createElement(Check, { className })
    case "document":
      return createElement(FileText, { className })
    case "system":
      return createElement(Clock, { className })
    case "status_change":
      return createElement(Activity, { className })
    case "reminder":
      return createElement(Clock, { className })
    case "message":
      return createElement(MessageSquare, { className })
    case "quote":
      return createElement(Info, { className })
    case "alert":
      return createElement(AlertTriangle, { className })
    default:
      return createElement(Bell, { className })
  }
}

/**
 * Formats a date string for notification display
 * @param dateString - ISO date string
 * @returns Formatted date string in French locale (e.g., "4 janv., 22:17")
 */
export function formatNotificationDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}
