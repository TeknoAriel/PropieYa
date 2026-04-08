// Utilities
export { cn } from './utils/cn'

// Primitives
export { Button, type ButtonProps } from './components/button'
export { Input, type InputProps } from './components/input'
export { Label } from './components/label'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/card'
export { Badge, type BadgeProps } from './components/badge'
export { Separator } from './components/separator'
export { Skeleton } from './components/skeleton'

// Form components
export { Switch } from './components/switch'
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './components/select'

// Overlay components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/dialog'
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/dropdown-menu'
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip'

// Navigation
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'

// Icons (lucide): export explícito para no chocar con el componente `Badge`
export {
  ArrowRight,
  Ban,
  Bell,
  Building2,
  Calendar,
  Clock,
  Eye,
  FileEdit,
  Filter,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Map,
  Mic,
  Menu,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
