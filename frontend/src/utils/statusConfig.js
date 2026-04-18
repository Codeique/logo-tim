export const SESSION_STATUS = {
  SCHEDULED: { label: 'Zakazano', chipColor: 'primary', hex: '#4A90E2', bg: 'rgba(74,144,226,0.85)' },
  COMPLETED:  { label: 'Završeno', chipColor: 'success', hex: '#10B981', bg: 'rgba(16,185,129,0.85)' },
  CANCELED:   { label: 'Otkazano', chipColor: 'error',   hex: '#EF4444', bg: 'rgba(239,68,68,0.7)'  },
};

export const ROLE_CONFIG = {
  ADMIN:           { label: 'Admin',           color: '#7C3AED', bg: 'rgba(124,58,237,0.09)',  border: 'rgba(124,58,237,0.22)'  },
  THERAPIST:       { label: 'Logoped',         color: '#0284C7', bg: 'rgba(2,132,199,0.09)',   border: 'rgba(2,132,199,0.22)'   },
  CHIEF_THERAPIST: { label: 'Glavni terapeut', color: '#0F766E', bg: 'rgba(15,118,110,0.09)',  border: 'rgba(15,118,110,0.22)'  },
  PATIENT:         { label: 'Pacijent',        color: '#64748B', bg: 'rgba(100,116,139,0.09)', border: 'rgba(100,116,139,0.22)' },
};

export const ROLE_OPTIONS = [
  { value: 'ADMIN',           label: 'Admin'           },
  { value: 'THERAPIST',       label: 'Logoped'         },
  { value: 'CHIEF_THERAPIST', label: 'Glavni terapeut' },
];

export const ACTION_CONFIG = {
  CREATE: { color: 'success', label: 'Kreiranje'   },
  UPDATE: { color: 'warning', label: 'Ažuriranje'  },
  DELETE: { color: 'error',   label: 'Brisanje'    },
};

export const TRANSACTION_TYPE = {
  PAYMENT: { label: 'Uplata', color: 'success' },
  REFUND:  { label: 'Povrat', color: 'error'   },
};
