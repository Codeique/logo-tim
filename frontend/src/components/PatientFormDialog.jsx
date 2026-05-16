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
  const [touched, setTouched] = useState({});

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
        sessionPrice: patient.sessionPrice ?? '',
        therapistId: patient.primaryTherapistId ?? '',
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
    setTouched({});
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

  // Pure validation — computed every render
  const validate = (f) => {
    const errs = {};
    if (!f.firstName.trim()) errs.firstName = 'Ovo polje je obavezno.';
    if (!f.lastName.trim()) errs.lastName = 'Ovo polje je obavezno.';
    if (!f.nickname.trim()) errs.nickname = 'Ovo polje je obavezno.';
    if (!f.birthDate) errs.birthDate = 'Datum je obavezan.';
    if (!f.phone.trim()) errs.phone = 'Ovo polje je obavezno.';
    if (!f.diagnosis.trim()) errs.diagnosis = 'Ovo polje je obavezno.';
    if (!f.isMilitary && (f.sessionPrice === '' || f.sessionPrice === null)) errs.sessionPrice = 'Ovo polje je obavezno.';
    if (!f.therapistId) errs.therapistId = 'Odaberite terapeuta.';
    if (f.isMilitary) {
      if (!f.nationalId.trim()) errs.nationalId = 'Ovo polje je obavezno.';
      if (!f.insuranceHolder.trim()) errs.insuranceHolder = 'Ovo polje je obavezno.';
      if (!f.medicalFileNumber.trim()) errs.medicalFileNumber = 'Ovo polje je obavezno.';
      if (!f.militaryPost.trim()) errs.militaryPost = 'Ovo polje je obavezno.';
    }
    return errs;
  };

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  const handleBlur = (field) => () => setTouched(t => ({ ...t, [field]: true }));

  // Text inputs — mark touched on blur
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Select inputs — mark touched immediately on change
  const setSelect = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setTouched(t => ({ ...t, [field]: true }));
  };

  const setCheck = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = () => {
    if (!isValid) return;
    mutation.mutate(form);
  };

  const err = (field) => !!(touched[field] && errors[field]);
  const help = (field) => touched[field] ? (errors[field] || '') : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{patient ? 'Izmeni pacijenta' : 'Dodaj pacijenta'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Ime" value={form.firstName}
              onChange={set('firstName')} onBlur={handleBlur('firstName')}
              error={err('firstName')} helperText={help('firstName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Prezime" value={form.lastName}
              onChange={set('lastName')} onBlur={handleBlur('lastName')}
              error={err('lastName')} helperText={help('lastName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Nadimak" value={form.nickname}
              onChange={set('nickname')} onBlur={handleBlur('nickname')}
              error={err('nickname')} helperText={help('nickname')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Datum rođenja" type="date" InputLabelProps={{ shrink: true }}
              value={form.birthDate} onChange={set('birthDate')} onBlur={handleBlur('birthDate')}
              error={err('birthDate')} helperText={help('birthDate')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Telefon" value={form.phone}
              onChange={set('phone')} onBlur={handleBlur('phone')}
              error={err('phone')} helperText={help('phone')} />
          </Grid>
          {!form.isMilitary && (
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Cena tretmana (RSD)" type="number"
                value={form.sessionPrice} onChange={set('sessionPrice')} onBlur={handleBlur('sessionPrice')}
                error={err('sessionPrice')} helperText={help('sessionPrice')} />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth select label="Dodeljeni terapeut"
              value={form.therapistId} onChange={setSelect('therapistId')}
              error={err('therapistId')} helperText={help('therapistId')}>
              <MenuItem value="">Niko</MenuItem>
              {(therapists || []).map(t => (
                <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth label="Dijagnoza" value={form.diagnosis}
              onChange={set('diagnosis')} onBlur={handleBlur('diagnosis')}
              error={err('diagnosis')} helperText={help('diagnosis')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Napomene" value={form.notes} onChange={set('notes')} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={<Switch checked={form.isMilitary} onChange={setCheck('isMilitary')} color="warning" />}
                label="Vojni osiguranik"
              />
            </Box>
          </Grid>

          {form.isMilitary && (
            <>
              <Grid item xs={12}><Divider><Typography variant="caption">Vojni podaci</Typography></Divider></Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Matični broj" value={form.nationalId}
                  onChange={set('nationalId')} onBlur={handleBlur('nationalId')}
                  error={err('nationalId')} helperText={help('nationalId')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Nosač osiguranja" value={form.insuranceHolder}
                  onChange={set('insuranceHolder')} onBlur={handleBlur('insuranceHolder')}
                  error={err('insuranceHolder')} helperText={help('insuranceHolder')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Broj kartona" value={form.medicalFileNumber}
                  onChange={set('medicalFileNumber')} onBlur={handleBlur('medicalFileNumber')}
                  error={err('medicalFileNumber')} helperText={help('medicalFileNumber')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Vojni pošt." value={form.militaryPost}
                  onChange={set('militaryPost')} onBlur={handleBlur('militaryPost')}
                  error={err('militaryPost')} helperText={help('militaryPost')} />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Otkaži</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : (patient ? 'Ažuriraj' : 'Kreiraj')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
