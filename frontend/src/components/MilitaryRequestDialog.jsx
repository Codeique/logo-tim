import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, CircularProgress,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

const thisYear = new Date().getFullYear();
const EMPTY = {
  patientId: '',
  requestNumber: `#${thisYear}-01`,
  totalSessions: '20',
  usedSessions: '0',
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 6 * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
  note: '',
};

export default function MilitaryRequestDialog({ open, onClose, request, patientId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (request) {
      setForm({
        patientId: request.patientId || '',
        requestNumber: request.requestNumber || '',
        totalSessions: String(request.totalSessions ?? '20'),
        usedSessions: String(request.usedSessions ?? '0'),
        validFrom: request.validFrom ? request.validFrom.split('T')[0] : '',
        validUntil: request.validUntil ? request.validUntil.split('T')[0] : '',
        note: request.note || '',
      });
    } else {
      setForm({ ...EMPTY, patientId: patientId || '' });
    }
  }, [request, patientId, open]);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-military'],
    queryFn: () => api.get('/patients?isMilitary=true&limit=200').then(r => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    }),
    enabled: open && !patientId,
  });

  const mutation = useMutation({
    mutationFn: (data) => request
      ? api.put(`/military-requests/${request.id}`, data).then(r => r.data)
      : api.post('/military-requests', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['militaryRequests'] });
      qc.invalidateQueries({ queryKey: ['patient'] });
      toast.success(request ? 'Zahtev ažuriran' : 'Zahtev kreiran');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!form.requestNumber) return toast.error('Broj zahteva je obavezan');
    if (!form.validFrom) return toast.error('Datum od je obavezan');
    if (!form.validUntil) return toast.error('Datum do je obavezan');
    if (form.validUntil < form.validFrom) return toast.error('Datum do ne sme biti pre datuma od');
    // Status is computed server-side from dates — do not send it
    const { ...payload } = form;
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{request ? 'Izmeni vojni zahtev' : 'Novi vojni zahtev'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {!patientId && !request && (
            <Grid item xs={12}>
              <TextField fullWidth select label="Pacijent *" value={form.patientId} onChange={set('patientId')}>
                <MenuItem value=""><em>Odaberi pacijenta</em></MenuItem>
                {(patients || []).map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Broj zahteva *" value={form.requestNumber} onChange={set('requestNumber')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Ukupno tretmana" type="number" value={form.totalSessions} onChange={set('totalSessions')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Važi od *"
              InputLabelProps={{ shrink: true }}
              value={form.validFrom}
              onChange={set('validFrom')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Važi do *"
              InputLabelProps={{ shrink: true }}
              value={form.validUntil}
              onChange={set('validUntil')}
              inputProps={{ min: form.validFrom || undefined }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Napomena" multiline rows={2} value={form.note} onChange={set('note')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : (request ? 'Ažuriraj' : 'Kreiraj')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
