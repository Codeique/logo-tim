import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tab, Tabs, Avatar, Skeleton, Alert, IconButton, Tooltip,
} from '@mui/material';
import { ArrowBack, Edit, Shield, Add, Download, Person } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
import api from '../api/axios';
import { computeRequestStatus, requestStatusColor, requestStatusLabel } from '../utils/militaryStatus';
import { formatCurrency } from '../utils/currency';
import useAuthStore from '../store/authStore';
import PatientFormDialog from '../components/PatientFormDialog';
import AddTransactionDialog from '../components/AddTransactionDialog';
import AddEvaluationDialog from '../components/AddEvaluationDialog';
import MilitaryRequestDialog from '../components/MilitaryRequestDialog';

const TabPanel = ({ value, index, children }) =>
  value === index ? <Box sx={{ pt: 2.5 }}>{children}</Box> : null;

const InfoRow = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500} sx={{ color: value ? 'text.primary' : 'text.disabled' }}>
      {value || '—'}
    </Typography>
  </Box>
);

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [milOpen, setMilOpen] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
  });

  const handleTravelOrder = async (month, year) => {
    const url = `/api/travel-orders/generate?patientId=${id}&month=${month}&year=${year}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Skeleton height={80} sx={{ borderRadius: 1 }} />
        <Grid container spacing={2.5}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton height={120} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton height={400} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (!patient) return <Alert severity="error" sx={{ borderRadius: 1 }}>Pacijent nije pronađen</Alert>;

  const today = new Date();
  // Use calendar-day granularity (same as computeRequestStatus) to avoid false
  // negatives caused by validUntil being stored as UTC midnight: comparing a full
  // DateTime "today" against midnight would mark the expiry day as already expired.
  const activeRequest = patient.militaryRequests?.find(r => {
    const daysFromStart = differenceInCalendarDays(today, new Date(r.validFrom));
    const daysLeft = differenceInCalendarDays(new Date(r.validUntil), today);
    return daysFromStart >= 0 && daysLeft >= 0;
  }) ?? null;
  const daysLeft = activeRequest
    ? differenceInCalendarDays(new Date(activeRequest.validUntil), today)
    : null;
  const activeStatus = activeRequest ? computeRequestStatus(activeRequest.validFrom, activeRequest.validUntil) : null;
  const requestColor = activeStatus ? requestStatusColor(activeStatus) : 'default';

  return (
    <Box>
      {/* Page header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 3,
        flexWrap: 'wrap',
      }}>
        <Tooltip title="Nazad na pacijente">
          <IconButton
            onClick={() => navigate('/patients')}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Avatar sx={{
          width: 44,
          height: 44,
          bgcolor: 'primary.main',
          fontWeight: 700,
          fontSize: 16,
        }}>
          {patient.firstName[0]}{patient.lastName[0]}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {patient.firstName} {patient.lastName}
            </Typography>
            {patient.isMilitary && (
              <Chip
                icon={<Shield sx={{ fontSize: 14 }} />}
                label="Vojni"
                color="warning"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
            <Chip
              label={patient.isActive ? 'Aktivan' : 'Neaktivan'}
              color={patient.isActive ? 'success' : 'default'}
              size="small"
              sx={patient.isActive ? {
                bgcolor: 'rgba(16,185,129,0.1)',
                color: 'success.dark',
                border: 'none',
                fontWeight: 600,
              } : {}}
            />
          </Box>
          {patient.nickname && (
            <Typography variant="body2" color="text.secondary">
              "{patient.nickname}"
            </Typography>
          )}
        </Box>

        {['ADMIN', 'THERAPIST'].includes(user?.role) && (
          <Button
            variant="outlined"
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            onClick={() => setEditOpen(true)}
            size="small"
          >
            Izmeni
          </Button>
        )}
      </Box>

      {/* Info cards */}
      <Grid container spacing={2.5} mb={2.5}>
        {/* Profile card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Person sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                  Profil
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow label="Telefon" value={patient.phone} />
                <InfoRow label="Dijagnoza" value={patient.diagnosis} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial / Military info */}
        {!patient.isMilitary ? (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 2 }}>
                    Stanje računa
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={patient.accountBalance > 0 ? 'success.main' : 'text.primary'}
                    sx={{ lineHeight: 1.1, mb: 1.5 }}
                  >
                    {formatCurrency(patient.accountBalance)}
                  </Typography>
                  {['ADMIN', 'THERAPIST'].includes(user?.role) && (
                    <Button
                      size="small"
                      startIcon={<Add sx={{ fontSize: 14 }} />}
                      onClick={() => setTxOpen(true)}
                      variant="outlined"
                      fullWidth
                    >
                      Dodaj uplatu
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 2 }}>
                    Preostalo tretmana
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={patient.remainingSessions > 0 ? 'primary.main' : 'error.main'}
                    sx={{ lineHeight: 1.1 }}
                  >
                    {patient.remainingSessions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Na osnovu stanja
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 2 }}>
                    Aktivni zahtev
                  </Typography>
                  {activeRequest ? (
                    <>
                      <Typography fontWeight={700} fontSize={16} mb={1}>
                        {activeRequest.requestNumber}
                      </Typography>
                      <Chip
                        label={daysLeft <= 0 ? 'Ističe danas' : `${daysLeft} dana`}
                        color={requestColor}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </>
                  ) : (
                    <Typography color="text.secondary" fontSize={14}>Nema aktivnog zahteva</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 2 }}>
                    Iskorišćeni tretmani
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                    {activeRequest ? `${activeRequest.usedSessions} / ${activeRequest.totalSessions}` : '—'}
                  </Typography>
                  {activeRequest && (
                    <Typography variant="caption" color="text.secondary">
                      Važi do {format(new Date(activeRequest.validUntil), 'dd.MM.yyyy')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Therapist card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow
                  label="Logoped"
                  value={patient.therapist ? `${patient.therapist.firstName} ${patient.therapist.lastName}` : null}
                />
                <InfoRow
                  label="Cena tretmana"
                  value={formatCurrency(patient.sessionPrice)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Military info card */}
      {patient.isMilitary && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield sx={{ fontSize: 18, color: 'warning.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Vojni podaci
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['ADMIN', 'THERAPIST'].includes(user?.role) && (
                  <Button
                    size="small"
                    startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={() => setMilOpen(true)}
                    variant="outlined"
                  >
                    Novi zahtev
                  </Button>
                )}
                <Button
                  size="small"
                  startIcon={<Download sx={{ fontSize: 14 }} />}
                  variant="outlined"
                  onClick={() => handleTravelOrder(new Date().getMonth() + 1, new Date().getFullYear())}
                >
                  Putni nalog PDF
                </Button>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <InfoRow label="Matični broj" value={patient.nationalId} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <InfoRow label="Nosač osiguranja" value={patient.insuranceHolder} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <InfoRow label="Broj kartona" value={patient.medicalFileNumber} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <InfoRow label="Vojni pošt." value={patient.militaryPost} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`Tretmani (${patient.sessions?.length || 0})`} />
            <Tab label={`Transakcije (${patient.transactions?.length || 0})`} />
            <Tab label={`Evaluacije (${patient.evaluations?.length || 0})`} />
            {patient.isMilitary && <Tab label={`Vojni zahtevi (${patient.militaryRequests?.length || 0})`} />}
          </Tabs>
        </Box>

        <CardContent>
          {/* Sessions tab */}
          <TabPanel value={tab} index={0}>
            {patient.sessions?.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Nema tretmana</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Datum</TableCell>
                      <TableCell>Vreme</TableCell>
                      <TableCell>Logoped</TableCell>
                      <TableCell>Prostorija</TableCell>
                      <TableCell>Trajanje</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Plaćeno</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patient.sessions?.map(s => (
                      <TableRow key={s.id} hover>
                        <TableCell>{format(new Date(s.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{s.startTime}</TableCell>
                        <TableCell>{s.therapist?.firstName} {s.therapist?.lastName}</TableCell>
                        <TableCell>{s.room?.name || '—'}</TableCell>
                        <TableCell>{s.duration} min</TableCell>
                        <TableCell>
                          <Chip
                            label={s.status === 'COMPLETED' ? 'Završeno' : s.status === 'CANCELED' ? 'Otkazano' : 'Zakazano'}
                            size="small"
                            color={s.status === 'COMPLETED' ? 'success' : s.status === 'CANCELED' ? 'error' : 'primary'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.isPaid ? 'Da' : 'Ne'}
                            size="small"
                            color={s.isPaid ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Transactions tab */}
          <TabPanel value={tab} index={1}>
            {['ADMIN', 'THERAPIST'].includes(user?.role) && (
              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  variant="outlined"
                  onClick={() => setTxOpen(true)}
                >
                  Dodaj uplatu
                </Button>
              </Box>
            )}
            {patient.transactions?.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Nema transakcija</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Datum</TableCell>
                      <TableCell align="right">Iznos</TableCell>
                      <TableCell>Tip</TableCell>
                      <TableCell>Uneo</TableCell>
                      <TableCell>Napomena</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patient.transactions?.map(t => (
                      <TableRow key={t.id} hover>
                        <TableCell>{format(new Date(t.createdAt), 'dd.MM.yyyy HH:mm')}</TableCell>
                        <TableCell align="right">
                          <Typography
                            fontWeight={600}
                            sx={{ color: t.type === 'REFUND' ? 'error.main' : 'success.main' }}
                          >
                            {t.type === 'REFUND' ? '-' : '+'}{formatCurrency(t.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t.type === 'REFUND' ? 'Povrat' : 'Uplata'}
                            size="small"
                            color={t.type === 'REFUND' ? 'error' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{t.createdBy?.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{t.note || '—'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Evaluations tab */}
          <TabPanel value={tab} index={2}>
            {['ADMIN', 'THERAPIST'].includes(user?.role) && (
              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  variant="outlined"
                  onClick={() => setEvalOpen(true)}
                >
                  Dodaj evaluaciju
                </Button>
              </Box>
            )}
            {patient.evaluations?.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Nema evaluacija</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {patient.evaluations?.map(ev => (
                  <Card
                    key={ev.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'secondary.light',
                      bgcolor: 'rgba(54,128,200,0.03)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" mb={1}>
                        {format(new Date(ev.date), 'dd.MM.yyyy')}
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                        {ev.content}
                      </Typography>
                      {ev.therapyProposal && (
                        <Box sx={{
                          mt: 1.5,
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          borderLeft: '3px solid',
                          borderColor: 'secondary.main',
                        }}>
                          <Typography variant="caption" fontWeight={700} color="secondary.main" display="block" mb={0.5}>
                            Predlog terapije
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ev.therapyProposal}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>

          {/* Military requests tab */}
          {patient.isMilitary && (
            <TabPanel value={tab} index={3}>
              {patient.militaryRequests?.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">Nema vojnih zahteva</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Zahtev #</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Tretmani</TableCell>
                        <TableCell>Važi od</TableCell>
                        <TableCell>Važi do</TableCell>
                        <TableCell>Napomena</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patient.militaryRequests?.map(r => {
                        const rStatus = computeRequestStatus(r.validFrom, r.validUntil);
                        const dl = differenceInCalendarDays(new Date(r.validUntil), new Date());
                        const rowBg = rStatus === 'INACTIVE'
                          ? 'rgba(239,68,68,0.04)'
                          : rStatus === 'ACTIVE_WARNING'
                            ? 'rgba(245,158,11,0.04)'
                            : 'inherit';
                        return (
                          <TableRow key={r.id} hover sx={{ bgcolor: rowBg }}>
                            <TableCell sx={{ fontWeight: 600 }}>{r.requestNumber}</TableCell>
                            <TableCell>
                              <Chip
                                label={requestStatusLabel(rStatus)}
                                size="small"
                                color={requestStatusColor(rStatus)}
                              />
                            </TableCell>
                            <TableCell>{r.usedSessions} / {r.totalSessions}</TableCell>
                            <TableCell>{format(new Date(r.validFrom), 'dd.MM.yyyy')}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {format(new Date(r.validUntil), 'dd.MM.yyyy')}
                                {rStatus !== 'INACTIVE' && (
                                  <Chip
                                    label={dl <= 0 ? 'Danas' : `${dl}d`}
                                    size="small"
                                    color={requestStatusColor(rStatus)}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{r.note || '—'}</Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          )}
        </CardContent>
      </Card>

      <PatientFormDialog open={editOpen} onClose={() => setEditOpen(false)} patient={patient} />
      <AddTransactionDialog open={txOpen} onClose={() => setTxOpen(false)} patientId={id} />
      <AddEvaluationDialog open={evalOpen} onClose={() => setEvalOpen(false)} patientId={id} />
      <MilitaryRequestDialog open={milOpen} onClose={() => setMilOpen(false)} patientId={id} />
    </Box>
  );
}
