import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, CircularProgress,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

const EMPTY = { date: new Date().toISOString().split('T')[0], content: '', therapyProposal: '' };

export default function AddEvaluationDialog({ open, onClose, patientId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setTouched({});
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/evaluations', { ...data, patientId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', String(patientId)] });
      qc.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Evaluacija dodana');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška'),
  });

  // Pure validation — computed every render
  const validate = (f) => {
    const errs = {};
    if (!f.date) errs.date = 'Datum je obavezan.';
    if (!f.content.trim()) errs.content = 'Ovo polje je obavezno.';
    return errs;
  };

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  const handleBlur = (field) => () => setTouched(t => ({ ...t, [field]: true }));

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!isValid) return;
    mutation.mutate(form);
  };

  const err = (field) => !!(touched[field] && errors[field]);
  const help = (field) => touched[field] ? (errors[field] || '') : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dodaj evaluaciju</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth type="date" label="Datum *" InputLabelProps={{ shrink: true }}
              value={form.date} onChange={set('date')} onBlur={handleBlur('date')}
              error={err('date')} helperText={help('date')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth multiline rows={4} label="Sadržaj evaluacije *"
              value={form.content} onChange={set('content')} onBlur={handleBlur('content')}
              error={err('content')} helperText={help('content')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Predlog terapije"
              value={form.therapyProposal} onChange={set('therapyProposal')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Sačuvaj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
