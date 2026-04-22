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
  diagnosis: '', notes: '', sessionPrice: '', primaryTherapistId: '',
  isActive: true, isMilitary: false,
  nationalId: '', insuranceHolder: '', medicalFileNumber: '', militaryPost: '',
};

const NO_ERRORS = {
  firstName: '', lastName: '', nickname: '', birthDate: '', phone: '',
  diagnosis: '', sessionPrice: '', primaryTherapistId: '',
  nationalId: '', insuranceHolder: '', medicalFileNumber: '', militaryPost: '',
};

export default function PatientFormDialog({ open, onClose, patient }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState(NO_ERRORS);

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
        primaryTherapistId: patient.primaryTherapistId || '',
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
    setErrors(NO_ERRORS);
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

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };
  const setCheck = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

  const validate = () => {
    const errs = { ...NO_ERRORS };
    if (!form.firstName.trim()) errs.firstName = 'Obavezno polje';
    if (!form.lastName.trim()) errs.lastName = 'Obavezno polje';
    if (!form.nickname.trim()) errs.nickname = 'Obavezno polje';
    if (!form.birthDate) errs.birthDate = 'Obavezno polje';
    if (!form.phone.trim()) errs.phone = 'Obavezno polje';
    if (!form.diagnosis.trim()) errs.diagnosis = 'Obavezno polje';
    if (form.sessionPrice === '' || form.sessionPrice === null) errs.sessionPrice = 'Obavezno polje';
    if (!form.primaryTherapistId) errs.primaryTherapistId = 'Obavezno polje';
    if (form.isMilitary) {
      if (!form.nationalId.trim()) errs.nationalId = 'Obavezno polje';
      if (!form.insuranceHolder.trim()) errs.insuranceHolder = 'Obavezno polje';
      if (!form.medicalFileNumber.trim()) errs.medicalFileNumber = 'Obavezno polje';
      if (!form.militaryPost.trim()) errs.militaryPost = 'Obavezno polje';
    }
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    const hasError = Object.values(errs).some(v => v !== '');
    if (hasError) {
      setErrors(errs);
      toast.error('Popunite sva obavezna polja');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{patient ? 'Izmeni pacijenta' : 'Dodaj pacijenta'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Ime" value={form.firstName} onChange={set('firstName')}
              error={!!errors.firstName} helperText={errors.firstName} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Prezime" value={form.lastName} onChange={set('lastName')}
              error={!!errors.lastName} helperText={errors.lastName} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Nadimak" value={form.nickname} onChange={set('nickname')}
              error={!!errors.nickname} helperText={errors.nickname} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Datum rođenja" type="date" InputLabelProps={{ shrink: true }}
              value={form.birthDate} onChange={set('birthDate')}
              error={!!errors.birthDate} helperText={errors.birthDate} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Telefon" value={form.phone} onChange={set('phone')}
              error={!!errors.phone} helperText={errors.phone} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Cena tretmana (RSD)" type="number" value={form.sessionPrice} onChange={set('sessionPrice')}
              error={!!errors.sessionPrice} helperText={errors.sessionPrice} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth select label="Dodeljeni logoped" value={form.primaryTherapistId} onChange={set('primaryTherapistId')}
              error={!!errors.primaryTherapistId} helperText={errors.primaryTherapistId}>
              <MenuItem value="">Niko</MenuItem>
              {(therapists || []).map(t => (
                <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Dijagnoza" value={form.diagnosis} onChange={set('diagnosis')}
              error={!!errors.diagnosis} helperText={errors.diagnosis} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Napomene" value={form.notes} onChange={set('notes')} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel control={<Switch checked={form.isMilitary} onChange={setCheck('isMilitary')} color="warning" />} label="Vojni osiguranik" />
            </Box>
          </Grid>

          {form.isMilitary && (
            <>
              <Grid item xs={12}><Divider><Typography variant="caption">Vojni podaci</Typography></Divider></Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Matični broj" value={form.nationalId} onChange={set('nationalId')}
                  error={!!errors.nationalId} helperText={errors.nationalId} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Nosač osiguranja" value={form.insuranceHolder} onChange={set('insuranceHolder')}
                  error={!!errors.insuranceHolder} helperText={errors.insuranceHolder} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Broj kartona" value={form.medicalFileNumber} onChange={set('medicalFileNumber')}
                  error={!!errors.medicalFileNumber} helperText={errors.medicalFileNumber} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Vojni pošt." value={form.militaryPost} onChange={set('militaryPost')}
                  error={!!errors.militaryPost} helperText={errors.militaryPost} />
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
