export const STATUS_COLORS = {
  Critical: 'var(--status-critical)',
  High: 'var(--status-high)',
  Medium: 'var(--status-medium)',
  Low: 'var(--status-low)',
  Resolved: 'var(--status-resolved)',
  Compliant: 'var(--status-compliant)',
  Open: 'var(--status-open)',
  InProgress: 'var(--status-inprogress)',
  Closed: 'var(--status-closed)',
  PendingVerification: 'var(--status-pending)'
} as const;

export type TicketStatus = keyof typeof STATUS_COLORS;

export const TOKENS = {
  accent: '#4FD1C5',
  dark: {
    background: '#0B0E14',
    surface: '#141821',
    border: '#232838',
    textPrimary: '#E6E9EF',
    textMuted: '#8B92A5'
  },
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    border: '#E2E5EB',
    textPrimary: '#0B0E14',
    textMuted: '#8B92A5'
  }
};
