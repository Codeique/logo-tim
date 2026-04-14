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

  useEffect(() => { if (open) setForm(EMPTY); }, [open]);

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

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dodaj evaluaciju</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField fullWidth type="date" label="Datum" InputLabelProps={{ shrink: true }}
              value={form.date} onChange={set('date')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={4} label="Sadržaj evaluacije *"
              value={form.content} onChange={set('content')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Predlog terapije"
              value={form.therapyProposal} onChange={set('therapyProposal')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={() => {
          if (!form.content) return toast.error('Sadržaj je obavezan');
          mutation.mutate(form);
        }} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Sačuvaj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
