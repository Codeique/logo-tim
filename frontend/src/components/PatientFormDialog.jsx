import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Switch, FormControlLabel,
  Divider, Typography, MenuItem, CircularProgress, Box,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

const EMPTY = {
  firstName: '', lastName: '', nickname: '', birthDate: '', phone: '',
  diagnosis: '', notes: '', sessionPrice: '', therapistId: '',
  isActive: true, isMilitary: false,
  nationalId: '', insuranceHolder: '', medicalFileNumber: '', militaryPost: '',
};

export default function PatientFormDialog({ open, onClose, patient }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (patient) {
      setForm({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        nickname: patient.nickname || '',
        birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
        phone: patient.phone || '',
        diagnosis: patient.diagnosis || '',
        notes: patient.notes || '',
        sessionPrice: patient.sessionPrice || '',
        therapistId: patient.therapistId || '',
        isActive: patient.isActive !== false,
        isMilitary: patient.isMilitary || false,
        nationalId: patient.nationalId || '',
        insuranceHolder: patient.insuranceHolder || '',
        medicalFileNumber: patient.medicalFileNumber || '',
        militaryPost: patient.militaryPost || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [patient, open]);

  const { data: therapists = [] } = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.get('/therapists').then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data) => patient
      ? api.put(`/patients/${patient.id}`, data).then(r => r.data)
      : api.post('/patients', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patient', String(patient?.id)] });
      toast.success(patient ? 'Pacijent ažuriran' : 'Pacijent kreiran');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setCheck = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName) return toast.error('Ime i prezime su obavezni');
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{patient ? 'Izmeni pacijenta' : 'Dodaj pacijenta'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Ime *" value={form.firstName} onChange={set('firstName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Prezime *" value={form.lastName} onChange={set('lastName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Nadimak" value={form.nickname} onChange={set('nickname')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Datum rođenja" type="date" InputLabelProps={{ shrink: true }}
              value={form.birthDate} onChange={set('birthDate')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Telefon" value={form.phone} onChange={set('phone')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Cena tretmana (RSD)" type="number" value={form.sessionPrice} onChange={set('sessionPrice')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Dodeljeni logoped" value={form.therapistId} onChange={set('therapistId')}>
              <MenuItem value="">Niko</MenuItem>
              {(therapists || []).map(t => (
                <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Dijagnoza" value={form.diagnosis} onChange={set('diagnosis')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Napomene" value={form.notes} onChange={set('notes')} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={setCheck('isActive')} />} label="Aktivan" />
              <FormControlLabel control={<Switch checked={form.isMilitary} onChange={setCheck('isMilitary')} color="warning" />} label="Vojni osiguranik" />
            </Box>
          </Grid>

          {form.isMilitary && (
            <>
              <Grid item xs={12}><Divider><Typography variant="caption">Vojni podaci</Typography></Divider></Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Matični broj" value={form.nationalId} onChange={set('nationalId')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nosač osiguranja" value={form.insuranceHolder} onChange={set('insuranceHolder')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Broj kartona" value={form.medicalFileNumber} onChange={set('medicalFileNumber')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Vojni pošt." value={form.militaryPost} onChange={set('militaryPost')} />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : (patient ? 'Ažuriraj' : 'Kreiraj')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
