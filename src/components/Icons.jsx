const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const LockIcon = ({ size = 16, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth} {...base}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

export const SoundIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M17 9a4 4 0 0 1 0 6" />
  </svg>
)

export const ChevronIcon = ({ dir = 'left' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
)

export const BranchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M6 3v12" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
)

export const DomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M4 18a8 8 0 0 1 16 0" />
    <path d="M2 18h20" />
    <path d="M12 3v7" />
    <path d="M9 7l3 3 3-3" />
  </svg>
)

export const SheetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 10h16M10 4v16" />
  </svg>
)

const Icon = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}>
    {children}
  </svg>
)

export const BookmarkIcon = ({ filled, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6 4h12v17l-6-4-6 4z" />
  </svg>
)
export const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
)
export const FolderIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Icon>
)
export const StopwatchIcon = ({ size }) => (
  <Icon size={size}>
    <circle cx="12" cy="14" r="7" />
    <path d="M12 14V10M9 3h6M12 3v4" />
  </Icon>
)
export const FlagIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Icon>
)
export const NoteIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" />
  </Icon>
)
export const PaperclipIcon = () => (
  <Icon>
    <path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />
  </Icon>
)
export const HomeIcon = () => (
  <Icon>
    <path d="M4 11l8-7 8 7M6 10v10h12V10" />
  </Icon>
)
export const BookIcon = () => (
  <Icon>
    <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12M9 8h6" />
  </Icon>
)

export const FingerprintIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" strokeWidth="1.6" className="flex-none text-[#9ff3e2]" {...base}>
    <path d="M8 24c1-10 7-16 14-16s13 6 14 16" />
    <path d="M12 30c0-8 4-14 10-14s10 6 10 14" />
    <path d="M16 33c0-7 2-11 6-11s6 4 6 11" />
    <path d="M22 27v9" />
  </svg>
)
