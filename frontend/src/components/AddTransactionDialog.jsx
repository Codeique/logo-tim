import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, CircularProgress,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function AddTransactionDialog({ open, onClose, patientId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ patientId: patientId || '', amount: '', type: 'PAYMENT', note: '' });

  useEffect(() => {
    setForm(f => ({ ...f, patientId: patientId || '' }));
  }, [patientId, open]);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-active'],
    queryFn: () => api.get('/patients?active=true&limit=200').then(r => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    }),
    enabled: open && !patientId,
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/transactions', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patient'] });
      toast.success('Transakcija dodana');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!form.patientId || !form.amount) return toast.error('Pacijent i iznos su obavezni');
    if (parseFloat(form.amount) <= 0) return toast.error('Iznos mora biti pozitivan');
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Dodaj transakciju</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {!patientId && (
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
            <TextField fullWidth label="Iznos (RSD) *" type="number" value={form.amount} onChange={set('amount')} inputProps={{ min: 0, step: 0.01 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Tip" value={form.type} onChange={set('type')}>
              <MenuItem value="PAYMENT">Uplata</MenuItem>
              <MenuItem value="REFUND">Povrat</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Napomena" value={form.note} onChange={set('note')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Dodaj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
