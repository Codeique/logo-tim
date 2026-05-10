import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, CircularProgress,
  Alert, Autocomplete, Divider, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { SESSION_STATUS } from '../utils/statusConfig';

const EMPTY = {
  patientId: '', therapistId: '', roomId: '', date: '',
  startTime: '', duration: '45', treatmentType: '',
  status: 'SCHEDULED', isPaid: false, report: '',
};

export default function SessionFormDialog({ open, onClose, session, defaultSlot }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [conflictError, setConflictError] = useState('');

  useEffect(() => {
    if (session) {
      setForm({
        patientId: session.patientId || '',
        therapistId: session.therapistId || '',
        roomId: session.roomId || '',
        date: session.date ? session.date.split('T')[0] : '',
        startTime: session.startTime || '',
        duration: session.duration || '45',
        treatmentType: session.treatmentType || '',
        status: session.status || 'SCHEDULED',
        isPaid: session.isPaid || false,
        report: session.report || '',
      });
    } else if (defaultSlot) {
      setForm(f => ({ ...EMPTY, date: defaultSlot.date, startTime: defaultSlot.startTime, roomId: defaultSlot.roomId ?? '' }));
    } else {
      setForm(EMPTY);
    }
    setConflictError('');
  }, [session, defaultSlot, open]);

  const patientsUrl = session ? '/patients?limit=200' : '/patients?active=true&limit=200';

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-form', session ? 'all' : 'active'],
    queryFn: () => api.get(patientsUrl).then(r => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    }),
    enabled: open,
  });

  const { data: therapists = [] } = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.get('/therapists').then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    }),
    enabled: open,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    }),
    enabled: open,
  });

  const { data: treatmentTypes = [] } = useQuery({
    queryKey: ['treatment-types'],
    queryFn: () => api.get('/sessions/treatment-types').then(r => r.data),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data) => session
      ? api.put(`/sessions/${session.id}`, data).then(r => r.data)
      : api.post('/sessions', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['treatment-types'] });
      toast.success(session ? 'Tretman ažuriran' : 'Tretman kreiran');
      onClose();
    },
    onError: (e) => {
      if (e.response?.status === 409) {
        setConflictError(e.response.data.message);
      } else if (e.response?.status === 422) {
        const errs = e.response.data?.errors;
        const msg = Array.isArray(errs) ? errs.map(er => er.msg).join(', ') : 'Nevalidni podaci';
        toast.error(msg);
      } else {
        toast.error(e.response?.data?.message || 'Greška');
      }
    },
  });

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setConflictError('');
  };

  const handleSubmit = () => {
    if (!form.patientId || !form.therapistId || !form.date || !form.startTime) {
      return toast.error('Pacijent, terapeut, datum i vreme su obavezni');
    }
    const payload = { ...form };
    // roomId: in edit mode send null to clear; in create mode omit (backend defaults to null)
    if (!payload.roomId) {
      if (session) payload.roomId = null;
      else delete payload.roomId;
    }
    // treatmentType: in edit mode send null to clear; in create mode omit
    if (!payload.treatmentType) {
      if (session) payload.treatmentType = null;
      else delete payload.treatmentType;
    }
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{session ? 'Izmeni tretman' : 'Zakaži tretman'}</DialogTitle>
      <DialogContent>
        {conflictError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{conflictError}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField fullWidth select label="Pacijent *" value={form.patientId} onChange={set('patientId')}>
              <MenuItem value=""><em>Odaberi pacijenta</em></MenuItem>
              {patients.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Terapeut *" value={form.therapistId} onChange={set('therapistId')}>
              <MenuItem value=""><em>Odaberi terapeuta</em></MenuItem>
              {therapists.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Prostorija" value={form.roomId} onChange={set('roomId')}>
              <MenuItem value="">Nema</MenuItem>
              {rooms.map(r => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="date" label="Datum *" InputLabelProps={{ shrink: true }}
              value={form.date} onChange={set('date')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Vreme početka *" InputLabelProps={{ shrink: true }}
              value={form.startTime} onChange={set('startTime')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Trajanje (min)" type="number" value={form.duration} onChange={set('duration')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={treatmentTypes}
              value={form.treatmentType}
              onChange={(_, v) => setForm(f => ({ ...f, treatmentType: v || '' }))}
              onInputChange={(_, v) => setForm(f => ({ ...f, treatmentType: v }))}
              renderInput={(params) => <TextField {...params} fullWidth label="Tip tretmana" />}
            />
          </Grid>
          {session && (
            <Grid item xs={12} sm={form.status === 'COMPLETED' ? 6 : 12}>
              <TextField fullWidth select label="Status" value={form.status} onChange={set('status')}>
                {Object.entries(SESSION_STATUS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          {session && form.status === 'COMPLETED' && (
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Naplata" value={form.isPaid ? 'paid' : 'unpaid'}
                onChange={(e) => setForm(f => ({ ...f, isPaid: e.target.value === 'paid' }))}>
                <MenuItem value="paid">Naplaćeno</MenuItem>
                <MenuItem value="unpaid">Nije naplaćeno</MenuItem>
              </TextField>
            </Grid>
          )}
          {session && form.status === 'COMPLETED' && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Izveštaj o tretmanu
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Beleške / evaluacija"
                placeholder="Unesite beleške o toku tretmana, napretku pacijenta..."
                value={form.report}
                onChange={set('report')}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : (session ? 'Ažuriraj' : 'Zakaži')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
