import { createTheme } from '@mui/material/styles';

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#4A90E2', light: '#6BA3E8', dark: '#3A7BD5' },
      secondary: { main: '#3680C8', light: '#5B9BD8', dark: '#2A6CB5' },
      success: { main: '#10B981', light: '#D1FAE5', dark: '#059669' },
      warning: { main: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
      error: { main: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
      info: { main: '#3B82F6', light: '#DBEAFE' },
      background: {
        default: mode === 'dark' ? '#0F172A' : '#F1F5F9',
        paper: mode === 'dark' ? '#1E293B' : '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#F1F5F9' : '#0F172A',
        secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
      },
      divider: mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      action: {
        hover: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        selected: mode === 'dark' ? 'rgba(74,144,226,0.15)' : '#E8F4FF',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.5px' },
      h5: { fontWeight: 700, letterSpacing: '-0.3px' },
      h6: { fontWeight: 600, letterSpacing: '-0.2px' },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.5 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'
              : '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
            border: mode === 'dark'
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid #E2E8F0',
            borderRadius: 10,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '20px',
            '&:last-child': { paddingBottom: '20px' },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            letterSpacing: 0,
            transition: 'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 14px rgba(74,144,226,0.28)',
            },
          },
          // Outlined base: transparent bg, smooth transitions
          outlined: {
            backgroundColor: 'transparent',
          },
          // Primary outlined: blue border + text, light blue hover fill
          outlinedPrimary: {
            borderColor: 'rgba(74,144,226,0.55)',
            color: '#4A90E2',
            '&:hover': {
              backgroundColor: 'rgba(74,144,226,0.06)',
              borderColor: '#4A90E2',
            },
          },
          // Error outlined: red border + text, light red hover fill
          outlinedError: {
            borderColor: 'rgba(239,68,68,0.55)',
            color: '#EF4444',
            '&:hover': {
              backgroundColor: 'rgba(239,68,68,0.06)',
              borderColor: '#EF4444',
            },
          },
          // Success outlined: green border + text, light green hover fill
          outlinedSuccess: {
            borderColor: 'rgba(16,185,129,0.55)',
            color: '#10B981',
            '&:hover': {
              backgroundColor: 'rgba(16,185,129,0.06)',
              borderColor: '#10B981',
            },
          },
          // Warning outlined: amber border + text, light amber hover fill
          outlinedWarning: {
            borderColor: 'rgba(245,158,11,0.55)',
            color: '#F59E0B',
            '&:hover': {
              backgroundColor: 'rgba(245,158,11,0.06)',
              borderColor: '#F59E0B',
            },
          },
          // Inherit outlined: neutral gray – used for Cancel/secondary actions
          outlinedInherit: {
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(100,116,139,0.45)',
            color: mode === 'dark' ? 'rgba(255,255,255,0.65)' : '#64748B',
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(100,116,139,0.05)',
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(100,116,139,0.65)',
            },
          },
          sizeSmall: {
            fontSize: '0.8125rem',
            padding: '4px 12px',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4A90E2',
              borderWidth: 2,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: { borderRadius: 0 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
            color: mode === 'dark' ? '#94A3B8' : '#64748B',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: mode === 'dark'
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid #E2E8F0',
            padding: '10px 16px',
            whiteSpace: 'nowrap',
          },
          body: {
            borderBottom: mode === 'dark'
              ? '1px solid rgba(255,255,255,0.04)'
              : '1px solid #F1F5F9',
            padding: '12px 16px',
            fontSize: '0.875rem',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child td': { borderBottom: 0 },
            '&.MuiTableRow-hover:hover': {
              backgroundColor: mode === 'dark'
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(74,144,226,0.03)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            fontSize: '0.75rem',
            borderRadius: 8,
          },
          sizeSmall: {
            height: 22,
            fontSize: '0.7rem',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          elevation1: {
            boxShadow: mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.5)'
              : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
            backgroundImage: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 44,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.1rem',
            fontWeight: 700,
            padding: '20px 24px 12px',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: { padding: '8px 24px 16px' },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: '12px 24px 20px', gap: 8 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 700,
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPaginationItem-root': {
              borderRadius: 8,
            },
          },
        },
      },
    },
  });

export default getTheme;
