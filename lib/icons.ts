/**
 * 🎨 CENTRALIZED ICONS - Optimisation bundle pour icônes Lucide React
 *
 * Objectifs :
 * - Centraliser tous les imports d'icônes en un seul endroit
 * - Améliorer le tree shaking et réduire le bundle size
 * - Éviter les imports duplicqués d'icônes à travers l'app
 */

// ✅ Import centralisé - Tree shaking standard de lucide-react
import {
  // Auth & User
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  LogIn,
  LogOut,
  Shield,

  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Minus,

  // Actions
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Upload,
  Send,
  Copy,
  Check,
  CheckCircle,
  CheckCircle2,

  // Status & Alerts
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  BellRing,
  Clock,
  Calendar,
  CalendarDays,

  // Business & Properties
  Building2,
  Home,
  MapPin,
  Key,

  // Communication
  Phone,
  MessageSquare,

  // Tools & Work
  Wrench,
  Hammer,
  Settings,
  Cog,

  // Files & Documents
  FileText,
  File,
  Image,
  Paperclip,

  // Finance
  Euro,
  DollarSign,
  CreditCard,

  // Status indicators
  Play,
  Pause,

  // More UI
  MoreHorizontal,
  MoreVertical,
  Archive,
  Star,
  Heart,
  Flag,

  // Utilities
  Loader2,
  RefreshCw,
  ExternalLink,

  // Directions & Movements
  TrendingUp,
  TrendingDown,

  // Specialized icons pour SEIDO
  Droplets, // Plomberie
  Zap,      // Électricité
  Flame,    // Chauffage
  Paintbrush, // Peinture

} from "lucide-react"

// ✅ Export pour utilisation dans l'app
export {
  // Auth & User
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  LogIn,
  LogOut,
  Shield,

  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Minus,

  // Actions
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Upload,
  Send,
  Copy,
  Check,
  CheckCircle,
  CheckCircle2,

  // Status & Alerts
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  BellRing,
  Clock,
  Calendar,
  CalendarDays,

  // Business & Properties
  Building2,
  Home,
  MapPin,
  Key,

  // Communication
  Phone,
  MessageSquare,

  // Tools & Work
  Wrench,
  Hammer,
  Settings,
  Cog,

  // Files & Documents
  FileText,
  File,
  Image,
  Paperclip,

  // Finance
  Euro,
  DollarSign,
  CreditCard,

  // Status indicators
  Play,
  Pause,

  // More UI
  MoreHorizontal,
  MoreVertical,
  Archive,
  Star,
  Heart,
  Flag,

  // Utilities
  Loader2,
  RefreshCw,
  ExternalLink,

  // Directions & Movements
  TrendingUp,
  TrendingDown,

  // Specialized icons pour SEIDO
  Droplets,
  Zap,
  Flame,
  Paintbrush,
}

// ✅ Types pour meilleure IntelliSense
export type IconComponent = React.ComponentType<{
  className?: string
  size?: number | string
  strokeWidth?: number
}>