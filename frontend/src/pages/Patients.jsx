import React, { useState, memo, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Chip, InputAdornment, Avatar, Skeleton, Pagination,
  Select, MenuItem, FormControl, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  Add, Search, Edit, Shield, People, Person, Delete,
  HealthAndSafety, CheckCircle, Cancel, Warning, CheckCircleOutline,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import PatientFormDialog from '../components/PatientFormDialog';
import { formatCurrency } from '../utils/currency';

// --- Age calculation (Serbian compact format) ---
function calcAge(birthDate) {
  if (!birthDate) return null;
  const now = new Date();
  const birth = new Date(birthDate);
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years > 0 && months > 0) return `${years}g ${months}m`;
  if (years > 0) return `${years}g`;
  if (months > 0) return `${months}m`;
  return '< 1m';
}

const FILTER_LABEL_SX = {
  display: 'block',
  mb: 0.75,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'text.secondary',
};

// --- Military status box (centered, compact) ---
function MilitaryStatusBox({ activeRequest }) {
  if (!activeRequest) {
    return (
      <Box sx={{
        borderRadius: 1,
        px: 1,
        py: 0.875,
        mb: 1.25,
        bgcolor: 'rgba(239,68,68,0.07)',
        border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.625,
      }}>
        <Cancel sx={{ fontSize: 14, color: 'error.dark', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'error.dark', lineHeight: 1.25 }}>
          Neaktivan
        </Typography>
      </Box>
    );
  }

  const daysLeft = differenceInDays(new Date(activeRequest.validUntil), new Date());
  const isExpiring = daysLeft <= 5;
  const totalSessions = activeRequest.totalSessions ?? 0;
  const usedSessions = activeRequest.usedSessions ?? 0;
  const expiryDate = format(new Date(activeRequest.validUntil), 'dd.MM.yyyy');

  return (
    <Box sx={{
      borderRadius: 1,
      px: 1.5,
      py: 1,
      mb: 1.25,
      bgcolor: isExpiring ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)',
      border: `1px solid ${isExpiring ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.2)'}`,
      textAlign: 'center',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
        <CheckCircle sx={{ fontSize: 13, color: isExpiring ? 'warning.main' : 'success.main' }} />
        <Typography sx={{
          fontSize: '0.63rem',
          color: isExpiring ? 'warning.dark' : 'success.dark',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700,
        }}>
          Aktivni uput
        </Typography>
      </Box>
      <Typography sx={{
        fontSize: '0.85rem',
        fontWeight: 800,
        color: isExpiring ? 'warning.dark' : 'success.dark',
        lineHeight: 1.3,
      }}>
        {usedSessions} / {totalSessions} iskorišćeno
      </Typography>
      <Typography sx={{
        fontSize: '0.7rem',
        fontWeight: 500,
        color: 'text.secondary',
        mt: 0.15,
      }}>
        | do {expiryDate}.
      </Typography>
    </Box>
  );
}

// --- State patient status box (centered, compact) ---
function StatePatientStatusBox({ p, isAdmin }) {
  const remainingSessions = Number(p.sessionPrice) > 0
    ? Math.floor(Number(p.accountBalance) / Number(p.sessionPrice))
    : (p.remainingSessions ?? null);
  const hasBalance = Number(p.accountBalance) > 0;

  if (isAdmin) {
    return (
      <Box sx={{
        borderRadius: 1,
        px: 1,
        py: 0.875,
        mb: 1.25,
        textAlign: 'center',
        bgcolor: hasBalance ? 'rgba(16,185,129,0.07)' : 'action.hover',
        border: hasBalance ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
      }}>
        <Typography sx={{ fontSize: '0.63rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', mb: 0.2 }}>
          Stanje računa
        </Typography>
        <Typography sx={{
          fontSize: '0.92rem',
          fontWeight: 800,
          color: hasBalance ? 'success.dark' : 'text.secondary',
          lineHeight: 1.2,
        }}>
          {formatCurrency(p.accountBalance, 0)}
        </Typography>
        {remainingSessions !== null && (
          <Typography sx={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: hasBalance ? 'success.main' : 'text.disabled',
            mt: 0.15,
          }}>
            ({remainingSessions} tretmana)
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{
      borderRadius: 1,
      px: 1,
      py: 0.875,
      mb: 1.25,
      textAlign: 'center',
      bgcolor: remainingSessions > 0 ? 'rgba(74,144,226,0.06)' : 'action.hover',
      border: remainingSessions > 0 ? '1px solid rgba(74,144,226,0.15)' : '1px solid transparent',
    }}>
      <Typography sx={{ fontSize: '0.63rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', mb: 0.2 }}>
        Preostalo tretmana
      </Typography>
      <Typography sx={{
        fontSize: '0.92rem',
        fontWeight: 800,
        color: remainingSessions > 0 ? 'primary.dark' : 'text.secondary',
        lineHeight: 1.2,
      }}>
        {remainingSessions !== null ? `${remainingSessions} tretmana` : '—'}
      </Typography>
    </Box>
  );
}

// --- Patient Card (memoized) ---
const PatientCard = memo(function PatientCard({ p, user, onEdit, onDelete, navigate }) {
  const age = calcAge(p.birthDate);
  const activeRequest = p.militaryRequests?.[0] ?? null;
  const isAdmin = user?.role === 'ADMIN';
  const canEdit = ['ADMIN', 'THERAPIST'].includes(user?.role);

  const initials = `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase();

  const avatarBg = p.isMilitary
    ? 'rgba(245,158,11,0.85)'
    : p.isActive
    ? 'primary.main'
    : 'action.disabledBackground';

  const cardBorderColor = p.isMilitary
    ? 'rgba(245,158,11,0.6)'
    : !p.isActive
    ? 'rgba(100,116,139,0.35)'
    : 'transparent';

  return (
    <Card
      onClick={() => navigate(`/patients/${p.id}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `3px solid ${cardBorderColor}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(74,144,226,0.13)',
        },
      }}
    >
      <CardContent sx={{ p: '16px !important', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Avatar + Age badge */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.125, position: 'relative' }}>
          <Avatar sx={{
            width: 54,
            height: 54,
            fontSize: 18,
            fontWeight: 700,
            bgcolor: avatarBg,
            color: p.isActive ? 'white' : 'text.disabled',
            boxShadow: p.isActive
              ? p.isMilitary
                ? '0 3px 10px rgba(245,158,11,0.25)'
                : '0 3px 10px rgba(74,144,226,0.2)'
              : 'none',
          }}>
            {initials}
          </Avatar>
          {age && (
            <Box sx={{
              position: 'absolute',
              top: -4,
              right: '10%',
              bgcolor: p.isMilitary ? 'rgba(245,158,11,0.12)' : 'rgba(74,144,226,0.1)',
              border: '1px solid',
              borderColor: p.isMilitary ? 'rgba(245,158,11,0.35)' : 'rgba(74,144,226,0.25)',
              borderRadius: '6px',
              px: 0.75,
              py: 0.15,
              display: 'inline-flex',
              alignItems: 'center',
            }}>
              <Typography sx={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: p.isMilitary ? 'warning.dark' : 'primary.dark',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                Godine: {age}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Full name */}
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1.3,
            textAlign: 'center',
            mb: p.nickname ? 0.3 : 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p.firstName} {p.lastName}
        </Typography>

        {/* Nickname */}
        {p.nickname && (
          <Typography
            sx={{
              fontSize: '0.73rem',
              color: 'text.secondary',
              fontStyle: 'italic',
              textAlign: 'center',
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            ({p.nickname})
          </Typography>
        )}

        {/* Divider */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 1.125 }} />


        {/* Therapist (centered) */}
        <Box sx={{
          bgcolor: 'action.hover',
          borderRadius: 1,
          px: 1,
          py: 0.75,
          mb: 1,
          textAlign: 'center',
        }}>
          <Typography sx={{
            fontSize: '0.6rem',
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
            display: 'block',
            mb: 0.15,
          }}>
            Logoped
          </Typography>
          <Typography sx={{
            fontSize: '0.775rem',
            fontWeight: 600,
            color: p.primaryTherapist ? 'text.primary' : 'text.disabled',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {p.primaryTherapist ? `${p.primaryTherapist.firstName} ${p.primaryTherapist.lastName}` : 'Nije dodeljen'}
          </Typography>
        </Box>

        {/* Insurance badge (centered) */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: p.isActive ? 1.125 : 0.75 }}>
          {p.isMilitary ? (
            <Chip
              icon={<Shield sx={{ fontSize: '12px !important' }} />}
              label="Vojni osiguranik"
              size="small"
              sx={{
                bgcolor: 'rgba(245,158,11,0.1)',
                color: 'warning.dark',
                border: '1px solid rgba(245,158,11,0.3)',
                fontWeight: 700,
                fontSize: '0.67rem',
                height: 22,
                '& .MuiChip-icon': { color: 'warning.main' },
              }}
            />
          ) : (
            <Chip
              icon={<HealthAndSafety sx={{ fontSize: '12px !important' }} />}
              label="Državni osiguranik"
              size="small"
              sx={{
                bgcolor: 'rgba(74,144,226,0.07)',
                color: 'primary.dark',
                border: '1px solid rgba(74,144,226,0.2)',
                fontWeight: 700,
                fontSize: '0.67rem',
                height: 22,
                '& .MuiChip-icon': { color: 'primary.main' },
              }}
            />
          )}
        </Box>

        {/* Inactive badge (centered) */}
        {!p.isActive && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.875 }}>
            <Chip
              label="Neaktivan"
              size="small"
              sx={{
                bgcolor: 'action.disabledBackground',
                color: 'text.disabled',
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 20,
              }}
            />
          </Box>
        )}

        {/* Status box pushed to bottom */}
        <Box sx={{ mt: 'auto' }}>
          {p.isMilitary ? (
            <MilitaryStatusBox activeRequest={activeRequest} />
          ) : (
            <StatePatientStatusBox p={p} isAdmin={isAdmin} />
          )}
        </Box>

        {/* Detail link */}
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 500,
            color: 'text.secondary',
            textAlign: 'center',
            mb: 1,
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
        >
          Klikni za detalje →
        </Typography>

        {/* Action buttons — both flex: 1, equal width */}
        <Box sx={{
          display: 'flex',
          gap: 0.75,
          pt: 1.125,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}>
          {canEdit && (
            <Button
              size="small"
              startIcon={<Edit sx={{ fontSize: 13 }} />}
              onClick={(e) => { e.stopPropagation(); onEdit(p); }}
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                py: 0.5,
                color: 'primary.main',
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: 'rgba(74,144,226,0.45)',
                '&:hover': { bgcolor: 'rgba(74,144,226,0.07)', borderColor: 'rgba(74,144,226,0.75)' },
              }}
            >
              Izmeni
            </Button>
          )}
          {isAdmin && (
            <Button
              size="small"
              startIcon={p.isActive
                ? <Delete sx={{ fontSize: 13 }} />
                : <CheckCircleOutline sx={{ fontSize: 13 }} />}
              onClick={(e) => { e.stopPropagation(); onDelete(p); }}
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                py: 0.5,
                color: p.isActive ? 'error.main' : 'success.main',
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: p.isActive ? 'rgba(239,68,68,0.45)' : 'rgba(16,185,129,0.45)',
                '&:hover': p.isActive
                  ? { bgcolor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.75)' }
                  : { bgcolor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.75)' },
              }}
            >
              {p.isActive ? 'Deaktiviraj' : 'Aktiviraj'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

// --- Skeleton card (matches compact card style) ---
function PatientCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.125 }}>
          <Skeleton variant="circular" width={54} height={54} />
        </Box>
        <Skeleton height={16} width="62%" sx={{ mx: 'auto', mb: 0.5, borderRadius: 1 }} />
        <Skeleton height={13} width="38%" sx={{ mx: 'auto', mb: 1, borderRadius: 1 }} />
        <Skeleton height={12} width="25%" sx={{ mx: 'auto', mb: 1.125, borderRadius: 1 }} />
        <Skeleton height={1} sx={{ mb: 1.125 }} />
        <Skeleton height={42} sx={{ borderRadius: 1, mb: 1 }} />
        <Skeleton height={22} width="55%" sx={{ mx: 'auto', mb: 1.125, borderRadius: 1 }} />
        <Skeleton height={50} sx={{ borderRadius: 1, mb: 1.25 }} />
        <Skeleton height={30} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
}

// --- Main page ---
export default function PatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [therapistFilter, setTherapistFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('active');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const LIMIT = 20;

  const resetPage = () => setPage(1);

  const { data: therapists = [] } = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.get('/therapists').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { search, therapistFilter, activityFilter, insuranceFilter, page }],
    queryFn: () => api.get('/patients', {
      params: {
        search: search || undefined,
        therapistId: therapistFilter || undefined,
        active: activityFilter === 'all' ? undefined : activityFilter === 'active' ? 'true' : 'false',
        isMilitary: insuranceFilter === 'all' ? undefined : insuranceFilter === 'military' ? 'true' : 'false',
        page,
        limit: LIMIT,
      },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const patients = data?.data || [];
  const total = data?.total || 0;

  const handleEdit = useCallback((p) => { setEditPatient(p); setFormOpen(true); }, []);
  const handleDeleteRequest = useCallback((p) => { setDeletePatient(p); }, []);

  const handleDeleteConfirm = async () => {
    if (!deletePatient) return;
    setDeleting(true);
    try {
      await api.patch(`/patients/${deletePatient.id}/toggle-active`);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDeletePatient(null);
    } finally {
      setDeleting(false);
    }
  };

  const activityLabel = activityFilter === 'inactive'
    ? 'Neaktivni pacijenti'
    : activityFilter === 'all'
    ? 'Svi pacijenti'
    : 'Aktivni pacijenti';

  return (
    <Box>
      {/* Page header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: 'action.selected',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <People sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Pacijenti ({total})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activityLabel}
            </Typography>
          </Box>
        </Box>
        {['ADMIN', 'THERAPIST'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setEditPatient(null); setFormOpen(true); }}
            sx={{ height: 40 }}
          >
            Dodaj pacijenta
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
            gap: 2,
          }}>
            <Box>
              <Typography variant="caption" sx={FILTER_LABEL_SX}>Pacijent</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Pretraži pacijente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 17, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={FILTER_LABEL_SX}>Logoped</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={therapistFilter}
                  onChange={(e) => { setTherapistFilter(e.target.value); resetPage(); }}
                  displayEmpty
                >
                  <MenuItem value="">Svi logopedi</MenuItem>
                  {therapists.map(t => (
                    <MenuItem key={t.id} value={String(t.id)}>
                      {t.firstName} {t.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="caption" sx={FILTER_LABEL_SX}>Aktivnost</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={activityFilter}
                  onChange={(e) => { setActivityFilter(e.target.value); resetPage(); }}
                >
                  <MenuItem value="active">Aktivni</MenuItem>
                  <MenuItem value="inactive">Neaktivni</MenuItem>
                  <MenuItem value="all">Svi</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="caption" sx={FILTER_LABEL_SX}>Osiguranje</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={insuranceFilter}
                  onChange={(e) => { setInsuranceFilter(e.target.value); resetPage(); }}
                >
                  <MenuItem value="all">Sve</MenuItem>
                  <MenuItem value="state">Državno</MenuItem>
                  <MenuItem value="military">Vojni</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Cards grid */}
      {isLoading ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
        }}>
          {[...Array(8)].map((_, i) => <PatientCardSkeleton key={i} />)}
        </Box>
      ) : patients.length === 0 ? (
        <Card>
          <Box sx={{ py: 9, textAlign: 'center' }}>
            <People sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              Nema pronađenih pacijenata
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Pokušajte sa drugim pojmom pretrage ili promenite filtere
            </Typography>
          </Box>
        </Card>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
        }}>
          {patients.map((p) => (
            <PatientCard
              key={p.id}
              p={p}
              user={user}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              navigate={navigate}
            />
          ))}
        </Box>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(total / LIMIT)}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Patient form dialog */}
      <PatientFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPatient(null); }}
        patient={editPatient}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deletePatient}
        onClose={() => !deleting && setDeletePatient(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {deletePatient?.isActive ? 'Deaktiviraj pacijenta' : 'Aktiviraj pacijenta'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletePatient?.isActive
              ? <>Da li ste sigurni da želite da deaktivirate pacijenta{' '}
                  <strong>{deletePatient?.firstName} {deletePatient?.lastName}</strong>?
                  Pacijent neće biti trajno obrisan.</>
              : <>Da li ste sigurni da želite da aktivirate pacijenta{' '}
                  <strong>{deletePatient?.firstName} {deletePatient?.lastName}</strong>?</>}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setDeletePatient(null)}
            disabled={deleting}
          >
            Otkaži
          </Button>
          <Button
            variant="outlined"
            color={deletePatient?.isActive ? 'error' : 'success'}
            onClick={handleDeleteConfirm}
            disabled={deleting}
          >
            {deleting ? '...' : deletePatient?.isActive ? 'Deaktiviraj' : 'Aktiviraj'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
