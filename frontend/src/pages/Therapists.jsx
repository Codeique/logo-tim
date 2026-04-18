import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  Avatar, Chip, Skeleton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Add, Edit, Email, Search, Delete, RoomPreferences,
  Person,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import TherapistFormDialog from '../components/TherapistFormDialog';
import { formatCurrency } from '../utils/currency';
import { ROLE_CONFIG } from '../utils/statusConfig';

const getRoleConfig = (role) => ROLE_CONFIG[role] ?? ROLE_CONFIG.THERAPIST;

// ─── Rooms display ─────────────────────────────────────────────────────────────
function RoomsSection({ therapistRooms = [], totalRooms = 0 }) {
  const count = therapistRooms.length;
  const allRooms = count === 0 || count === totalRooms;
  const roomText = allRooms
    ? 'Sve prostorije'
    : therapistRooms.map(r => r.name).join(', ');

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0.6 }}>
      <RoomPreferences sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, mt: '1px' }} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: '0.75rem', lineHeight: 1.5, textAlign: 'center' }}
      >
        {roomText}
      </Typography>
    </Box>
  );
}

// ─── Staff card ────────────────────────────────────────────────────────────────
function StaffCard({ person, onEdit, onDelete, totalRooms }) {
  const role = getRoleConfig(person.user?.role);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: '0 !important' }}>

        {/* ── Top header ────────────────────────────────────────── */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 3.5,
          pb: 2.5,
          px: 2.5,
          position: 'relative',
        }}>
          {/* Role badge – top-right */}
          <Chip
            label={role.label}
            size="small"
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              height: 22,
              fontSize: '0.685rem',
              fontWeight: 700,
              letterSpacing: '0.01em',
              bgcolor: role.bg,
              color: role.color,
              border: `1px solid ${role.border}`,
            }}
          />

          {/* Avatar – solid blue circle with white person icon */}
          <Avatar
            sx={{
              width: 72,
              height: 72,
              mb: 1.75,
              bgcolor: '#4A90E2',
              color: '#fff',
            }}
          >
            <Person sx={{ fontSize: 40 }} />
          </Avatar>

          {/* Name */}
          <Typography
            fontWeight={700}
            fontSize={15.5}
            sx={{ lineHeight: 1.3, textAlign: 'center', wordBreak: 'break-word', mb: 0.75 }}
          >
            {person.firstName} {person.lastName}
          </Typography>

          {/* Email – in header, centered */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Email sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontSize: '0.75rem' }}
            >
              {person.email}
            </Typography>
          </Box>
        </Box>

        {/* ── Body ──────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 2.5, pt: 0, pb: 2, gap: 1.75, alignItems: 'stretch' }}>

          {/* Pay rate */}
          <Box sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 500, display: 'block', mb: 0.25 }}>
              Zarada po tretmanu
            </Typography>
            <Typography fontWeight={700} fontSize={13.5} color="text.primary">
              {person.hourlyRate ? formatCurrency(person.hourlyRate, 0) : '—'}
            </Typography>
          </Box>

          {/* Rooms – plain centered text */}
          <RoomsSection therapistRooms={person.rooms ?? []} totalRooms={totalRooms} />
        </Box>

        {/* ── Actions ───────────────────────────────────────────── */}
        <Box sx={{
          display: 'flex',
          gap: 1,
          px: 2.5,
          pb: 2.5,
          pt: 0,
        }}>
          {/* Izmeni – blue outlined */}
          <Button
            size="small"
            fullWidth
            startIcon={<Edit sx={{ fontSize: 14 }} />}
            onClick={onEdit}
            sx={{
              color: 'primary.main',
              bgcolor: 'transparent',
              border: '1px solid',
              borderColor: 'rgba(74,144,226,0.5)',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(74,144,226,0.07)', borderColor: 'primary.main' },
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'none',
            }}
          >
            Izmeni
          </Button>
          {/* Obriši – red outlined */}
          <Button
            size="small"
            fullWidth
            startIcon={<Delete sx={{ fontSize: 14 }} />}
            onClick={onDelete}
            sx={{
              color: 'error.main',
              bgcolor: 'transparent',
              border: '1px solid',
              borderColor: 'rgba(239,68,68,0.45)',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: 'error.main' },
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'none',
            }}
          >
            Obriši
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <CardContent sx={{ p: '0 !important' }}>
        <Box sx={{ px: 2.5, pt: 3.5, pb: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton variant="circular" width={72} height={72} sx={{ mb: 1.75 }} />
          <Skeleton width={130} height={20} sx={{ mb: 0.75 }} />
          <Skeleton width={160} height={16} />
        </Box>
        <Box sx={{ px: 2.5, pt: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Skeleton height={52} sx={{ borderRadius: 1 }} />
          <Skeleton height={42} sx={{ borderRadius: 1 }} />
        </Box>
        <Box sx={{ px: 2.5, pb: 2.5, display: 'flex', gap: 1 }}>
          <Skeleton height={34} sx={{ flex: 1, borderRadius: 1 }} />
          <Skeleton height={34} sx={{ flex: 1, borderRadius: 1 }} />
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TherapistsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTherapist, setEditTherapist] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const { data: therapists = [], isLoading } = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.get('/therapists').then(r => r.data),
  });

  const { data: allRooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    }),
  });

  const totalRooms = allRooms.length;

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/therapists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      toast.success('Korisnik je obrisan');
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška pri brisanju'),
  });

  const filtered = therapists.filter(t =>
    search === '' ||
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ bgcolor: '#F4F6FB', minHeight: '100%', p: { xs: 0, sm: 0 } }}>
      {/* ── White container ─────────────────────────────────────── */}
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        overflow: 'hidden',
      }}>

        {/* ── Header strip (light blue) ────────────────────────── */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2.5,
          bgcolor: 'rgba(74,144,226,0.07)',
          borderBottom: '1px solid rgba(74,144,226,0.13)',
          flexWrap: 'wrap',
          gap: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Person sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography variant="h6" fontWeight={700} fontSize={18}>
              Logopedi ({filtered.length})
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setEditTherapist(null); setFormOpen(true); }}
            sx={{
              height: 40,
              px: 2.5,
              borderRadius: 1,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.9rem',
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 2px 8px rgba(74,144,226,0.35)' },
            }}
          >
            Dodaj logopeda
          </Button>
        </Box>

        {/* ── Search + grid ────────────────────────────────────── */}
        <Box sx={{ p: 3 }}>

          {/* Search */}
          <Box sx={{ mb: 3 }}>
            <TextField
              placeholder="Pretraži logopede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 1 },
              }}
              sx={{ maxWidth: 320 }}
            />
          </Box>

          {/* Grid – 3 per row on desktop, 2 on tablet, 1 on mobile */}
          <Grid container spacing={2.5}>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <SkeletonCard />
                </Grid>
              ))
            ) : filtered.length === 0 ? (
              <Grid item xs={12}>
                <Box sx={{
                  py: 9,
                  textAlign: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}>
                  <Person sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5 }} />
                  <Typography color="text.secondary" fontWeight={600} fontSize={15}>
                    Nema pronađenih logopeda
                  </Typography>
                  <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                    Pokušajte sa drugačijim pretragom
                  </Typography>
                </Box>
              </Grid>
            ) : filtered.map(t => (
              <Grid item xs={12} sm={6} md={4} key={t.id}>
                <StaffCard
                  person={t}
                  totalRooms={totalRooms}
                  onEdit={() => { setEditTherapist(t); setFormOpen(true); }}
                  onDelete={() => setDeleteId(t.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ── Form dialog ─────────────────────────────────────────── */}
      <TherapistFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTherapist(null); }}
        therapist={editTherapist}
      />

      {/* ── Delete confirmation ──────────────────────────────────── */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Obriši logopeda?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Ova akcija ne može biti poništena. Korisnik će biti trajno obrisan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} variant="outlined" color="inherit">Otkaži</Button>
          <Button
            color="error"
            variant="outlined"
            onClick={() => deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            Obriši
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
