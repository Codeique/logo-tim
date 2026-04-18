import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Checkbox, CircularProgress,
  Typography, Box, Select, MenuItem, FormControl,
  InputLabel, IconButton, Divider,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { ROLE_OPTIONS } from '../utils/statusConfig';

const EMPTY = {
  firstName: '', lastName: '', email: '', password: '',
  role: 'THERAPIST',
  hourlyRate: '', roomIds: [], isActive: true,
};

export default function TherapistFormDialog({ open, onClose, therapist }) {
  const qc = useQueryClient();
  const isEdit = Boolean(therapist);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (therapist) {
      setForm({
        firstName: therapist.firstName || '',
        lastName: therapist.lastName || '',
        email: therapist.email || '',
        password: '',
        role: therapist.user?.role || 'THERAPIST',
        hourlyRate: therapist.hourlyRate || '',
        roomIds: therapist.rooms?.map(r => r.id) || [],
        isActive: therapist.isActive !== false,
      });
    } else {
      setForm(EMPTY);
    }
  }, [therapist, open]);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data) => therapist
      ? api.put(`/therapists/${therapist.id}`, data).then(r => r.data)
      : api.post('/therapists', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['therapists'] });
      toast.success(therapist ? 'Logoped ažuriran' : 'Logoped kreiran');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleRoom = (id) => {
    setForm(f => ({
      ...f,
      roomIds: f.roomIds.includes(id) ? f.roomIds.filter(r => r !== id) : [...f.roomIds, id],
    }));
  };

  const selectAllRooms = () => setForm(f => ({ ...f, roomIds: rooms.map(r => r.id) }));
  const clearAllRooms = () => setForm(f => ({ ...f, roomIds: [] }));

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.email) return toast.error('Ime i email su obavezni');
    if (!isEdit && !form.password) return toast.error('Lozinka je obavezna za novog logopeda');
    const payload = {
      ...form,
      hourlyRate: form.hourlyRate === '' ? 0 : parseFloat(form.hourlyRate),
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
        },
      }}
    >
      {/* ── Title bar ─────────────────────────────────────────────── */}
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        pt: 2.5,
        pb: 1.5,
      }}>
        <Typography fontWeight={700} fontSize={17}>
          {isEdit ? 'Izmeni logopeda' : 'Dodaj logopeda'}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mr: -0.5 }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* ── Form fields ───────────────────────────────────────────── */}
      <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Grid container spacing={2}>

          {/* Row 1: Ime + Prezime */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ime *"
              value={form.firstName}
              onChange={set('firstName')}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Prezime *"
              value={form.lastName}
              onChange={set('lastName')}
              size="small"
            />
          </Grid>

          {/* Row 2: Email */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email *"
              type="email"
              value={form.email}
              onChange={set('email')}
              size="small"
            />
          </Grid>

          {/* Password — create mode only */}
          {!isEdit && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lozinka *"
                type="password"
                value={form.password}
                onChange={set('password')}
                size="small"
              />
            </Grid>
          )}

          {/* Row 3: Rola + Zarada po tretmanu */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Rola</InputLabel>
              <Select value={form.role} label="Rola" onChange={set('role')}>
                {ROLE_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Zarada po tretmanu (RSD)"
              type="number"
              inputProps={{ min: 0, step: 100 }}
              value={form.hourlyRate}
              onChange={set('hourlyRate')}
              size="small"
            />
          </Grid>

          {/* Rooms section */}
          <Grid item xs={12}>
            {/* Section header + actions */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.25,
            }}>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Dodeljene prostorije
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography
                  variant="caption"
                  onClick={selectAllRooms}
                  sx={{
                    cursor: 'pointer',
                    color: 'primary.main',
                    fontWeight: 600,
                    userSelect: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Izaberi sve
                </Typography>
                <Typography
                  variant="caption"
                  onClick={clearAllRooms}
                  sx={{
                    cursor: 'pointer',
                    color: 'text.secondary',
                    fontWeight: 600,
                    userSelect: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Poništi sve
                </Typography>
              </Box>
            </Box>

            {/* Room list */}
            <Box sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {rooms.length === 0 ? (
                <Box sx={{ p: 2.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.disabled">Nema dostupnih prostorija</Typography>
                </Box>
              ) : rooms.map((r, idx) => {
                const checked = form.roomIds.includes(r.id);
                return (
                  <Box
                    key={r.id}
                    onClick={() => toggleRoom(r.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1.1,
                      cursor: 'pointer',
                      bgcolor: checked ? 'rgba(74,144,226,0.06)' : 'transparent',
                      borderTop: idx > 0 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: checked ? 'rgba(74,144,226,0.1)' : 'action.hover',
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={checked ? 600 : 400}
                      color={checked ? 'primary.main' : 'text.primary'}
                    >
                      {r.name}
                    </Typography>
                    <Checkbox
                      checked={checked}
                      size="small"
                      sx={{ p: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleRoom(r.id)}
                    />
                  </Box>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <Divider sx={{ mt: 2.5 }} />

      {/* ── Footer ────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
          }}
        >
          Otkaži
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 2px 8px rgba(74,144,226,0.35)' },
          }}
        >
          {mutation.isPending
            ? <CircularProgress size={20} color="inherit" />
            : 'Sačuvaj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
