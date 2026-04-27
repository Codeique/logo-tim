import React, { useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip, Skeleton, Avatar, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { People, EventNote, MeetingRoom, TrendingUp, Person, Shield } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { format, differenceInCalendarDays } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { SESSION_STATUS, TRANSACTION_TYPE } from '../utils/statusConfig';
import { formatCurrency } from '../utils/currency';
import { computeRequestStatus, requestStatusColor, requestStatusLabel } from '../utils/militaryStatus';

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

// ─── Patient dashboard ────────────────────────────────────────────────────────

function PatientDashboard() {
  const [tab, setTab] = useState(0);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-me'],
    queryFn: () => api.get('/patients/me').then(r => r.data),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Skeleton height={60} sx={{ borderRadius: 1 }} />
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

  if (!patient) return <Alert severity="error" sx={{ borderRadius: 1 }}>Profil pacijenta nije pronađen</Alert>;

  const today = new Date();
  const activeRequest = patient.militaryRequests?.find(r => {
    const daysFromStart = differenceInCalendarDays(today, new Date(r.validFrom));
    const daysLeft = differenceInCalendarDays(new Date(r.validUntil), today);
    return daysFromStart >= 0 && daysLeft >= 0;
  }) ?? null;
  const daysLeft = activeRequest ? differenceInCalendarDays(new Date(activeRequest.validUntil), today) : null;
  const activeStatus = activeRequest ? computeRequestStatus(activeRequest.validFrom, activeRequest.validUntil) : null;
  const requestColor = activeStatus ? requestStatusColor(activeStatus) : 'default';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontWeight: 700, fontSize: 16 }}>
          {patient.firstName[0]}{patient.lastName[0]}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {patient.firstName} {patient.lastName}
            </Typography>
            {patient.isMilitary && (
              <Chip icon={<Shield sx={{ fontSize: 14 }} />} label="Vojni" color="warning" size="small" sx={{ fontWeight: 600 }} />
            )}
            <Chip
              label={patient.isActive ? 'Aktivan' : 'Neaktivan'}
              color={patient.isActive ? 'success' : 'default'}
              size="small"
              sx={patient.isActive ? { bgcolor: 'rgba(16,185,129,0.1)', color: 'success.dark', border: 'none', fontWeight: 600 } : {}}
            />
          </Box>
          {patient.nickname && (
            <Typography variant="body2" color="text.secondary">"{patient.nickname}"</Typography>
          )}
        </Box>
      </Box>

      {/* Info cards */}
      <Grid container spacing={2.5} mb={2.5}>
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

        {!patient.isMilitary ? (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 2 }}>
                    Stanje računa
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={patient.accountBalance > 0 ? 'success.main' : 'text.primary'} sx={{ lineHeight: 1.1 }}>
                    {formatCurrency(patient.accountBalance)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 2 }}>
                    Preostalo tretmana
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={patient.remainingSessions > 0 ? 'primary.main' : 'error.main'} sx={{ lineHeight: 1.1 }}>
                    {patient.remainingSessions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>Na osnovu stanja</Typography>
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
                      <Typography fontWeight={700} fontSize={16} mb={1}>{activeRequest.requestNumber}</Typography>
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

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow label="Terapeut" value={patient.primaryTherapist ? `${patient.primaryTherapist.firstName} ${patient.primaryTherapist.lastName}` : null} />
                <InfoRow label="Cena tretmana" value={formatCurrency(patient.sessionPrice)} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Military info */}
      {patient.isMilitary && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Shield sx={{ fontSize: 18, color: 'warning.main' }} />
              <Typography variant="h6" fontWeight={600}>Vojni podaci</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><InfoRow label="Matični broj" value={patient.nationalId} /></Grid>
              <Grid item xs={6} sm={3}><InfoRow label="Nosač osiguranja" value={patient.insuranceHolder} /></Grid>
              <Grid item xs={6} sm={3}><InfoRow label="Broj kartona" value={patient.medicalFileNumber} /></Grid>
              <Grid item xs={6} sm={3}><InfoRow label="Vojni pošt." value={patient.militaryPost} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label={`Tretmani (${patient.sessions?.length || 0})`} />
            <Tab label={`Transakcije (${patient.transactions?.length || 0})`} />
            {patient.isMilitary && <Tab label={`Vojni zahtevi (${patient.militaryRequests?.length || 0})`} />}
          </Tabs>
        </Box>

        <CardContent>
          {/* Sessions */}
          <TabPanel value={tab} index={0}>
            {patient.sessions?.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><Typography color="text.secondary">Nema tretmana</Typography></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Datum</TableCell>
                      <TableCell>Vreme</TableCell>
                      <TableCell>Terapeut</TableCell>
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
                        <TableCell>{s.startTime?.slice(11, 16)}</TableCell>
                        <TableCell>{s.therapist?.firstName} {s.therapist?.lastName}</TableCell>
                        <TableCell>{s.room?.name || '—'}</TableCell>
                        <TableCell>{s.duration} min</TableCell>
                        <TableCell>
                          <Chip
                            label={(SESSION_STATUS[s.status] ?? SESSION_STATUS.SCHEDULED).label}
                            size="small"
                            color={(SESSION_STATUS[s.status] ?? SESSION_STATUS.SCHEDULED).chipColor}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={s.isPaid ? 'Da' : 'Ne'} size="small" color={s.isPaid ? 'success' : 'default'} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Transactions */}
          <TabPanel value={tab} index={1}>
            {patient.transactions?.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><Typography color="text.secondary">Nema transakcija</Typography></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Datum</TableCell>
                      <TableCell align="right">Iznos</TableCell>
                      <TableCell>Tip</TableCell>
                      <TableCell>Napomena</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patient.transactions?.map(t => (
                      <TableRow key={t.id} hover>
                        <TableCell>{format(new Date(t.createdAt), 'dd.MM.yyyy HH:mm')}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} sx={{ color: t.type === 'REFUND' ? 'error.main' : 'success.main' }}>
                            {t.type === 'REFUND' ? '-' : '+'}{formatCurrency(t.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(TRANSACTION_TYPE[t.type] ?? TRANSACTION_TYPE.PAYMENT).label}
                            size="small"
                            color={(TRANSACTION_TYPE[t.type] ?? TRANSACTION_TYPE.PAYMENT).color}
                            variant="outlined"
                          />
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

          {/* Military requests */}
          {patient.isMilitary && (
            <TabPanel value={tab} index={2}>
              {patient.militaryRequests?.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}><Typography color="text.secondary">Nema vojnih zahteva</Typography></Box>
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
                        const rowBg = rStatus === 'INACTIVE' ? 'rgba(239,68,68,0.04)' : rStatus === 'ACTIVE_WARNING' ? 'rgba(245,158,11,0.04)' : 'inherit';
                        return (
                          <TableRow key={r.id} hover sx={{ bgcolor: rowBg }}>
                            <TableCell sx={{ fontWeight: 600 }}>{r.requestNumber}</TableCell>
                            <TableCell>
                              <Chip label={requestStatusLabel(rStatus)} size="small" color={requestStatusColor(rStatus)} />
                            </TableCell>
                            <TableCell>{r.usedSessions} / {r.totalSessions}</TableCell>
                            <TableCell>{format(new Date(r.validFrom), 'dd.MM.yyyy')}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {format(new Date(r.validUntil), 'dd.MM.yyyy')}
                                {rStatus !== 'INACTIVE' && (
                                  <Chip label={dl <= 0 ? 'Danas' : `${dl}d`} size="small" color={requestStatusColor(rStatus)} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{r.note || '—'}</Typography></TableCell>
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
    </Box>
  );
}

// ─── Stat card (admin/therapist dashboard) ────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, gradient, onClick, loading, subtitle }) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' } : {},
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: 13, fontWeight: 500 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={60} height={44} />
          ) : (
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1, mb: 0.5 }}>
              {value}
            </Typography>
          )}
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{
          width: 48, height: 48, borderRadius: 1, background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, ml: 2,
        }}>
          <Icon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (user?.role === 'PATIENT') return <PatientDashboard />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče';

  const { data: patients, isLoading: loadingP } = useQuery({
    queryKey: ['patients', { active: true }],
    queryFn: () => api.get('/patients?active=true&limit=1').then(r => r.data),
  });

  const { data: sessions, isLoading: loadingS } = useQuery({
    queryKey: ['sessions', 'today'],
    queryFn: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return api.get(`/sessions?dateFrom=${today}&dateTo=${today}&limit=100`).then(r => r.data);
    },
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => r.data),
    enabled: user?.role === 'ADMIN',
  });

  const todaySessions = sessions?.data || [];
  const scheduled = todaySessions.filter(s => s.status === 'SCHEDULED');
  const completed = todaySessions.filter(s => s.status === 'COMPLETED');
  const canceled = todaySessions.filter(s => s.status === 'CANCELED');

  const displayName = user?.email?.split('@')[0] || '';

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 0.5 }}>
          {greeting}, {displayName} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {format(new Date(), 'EEEE, d. MMMM yyyy.', { locale: srLatn })}
        </Typography>
      </Box>

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Aktivni pacijenti"
            value={patients?.total ?? 0}
            icon={People}
            gradient="linear-gradient(135deg, #4A90E2, #6BA3E8)"
            onClick={() => navigate('/patients')}
            loading={loadingP}
            subtitle="Ukupno aktivnih"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Današnji tretmani"
            value={todaySessions.length}
            icon={EventNote}
            gradient="linear-gradient(135deg, #3680C8, #5B9BD8)"
            onClick={() => navigate('/sessions')}
            loading={loadingS}
            subtitle="Ukupno danas"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Zakazano danas"
            value={scheduled.length}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #F59E0B, #FBBF24)"
            loading={loadingS}
            subtitle="Čeka na tretman"
          />
        </Grid>
        {user?.role === 'ADMIN' && (
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Prostorije"
              value={rooms?.length ?? 0}
              icon={MeetingRoom}
              gradient="linear-gradient(135deg, #10B981, #34D399)"
              onClick={() => navigate('/rooms')}
              subtitle="Ukupno prostorija"
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Typography variant="h6" fontWeight={700}>Raspored za danas</Typography>
                <Chip
                  label={`${todaySessions.length} tretmana`}
                  size="small"
                  sx={{ bgcolor: 'action.selected', color: 'primary.main', fontWeight: 600 }}
                />
              </Box>

              {loadingS ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[...Array(4)].map((_, i) => <Skeleton key={i} height={56} sx={{ borderRadius: 1 }} />)}
                </Box>
              ) : todaySessions.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
                  <EventNote sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" fontWeight={500}>Nema zakazanih tretmana za danas</Typography>
                  <Typography variant="caption" color="text.disabled">Slobodan dan!</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {todaySessions.slice(0, 8).map((s) => {
                    const sc = SESSION_STATUS[s.status] || { chipColor: 'default', label: s.status };
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                          borderRadius: 1, border: '1px solid', borderColor: 'divider',
                          transition: 'background 0.1s',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{
                          minWidth: 52, height: 40, borderRadius: 1, bgcolor: 'action.selected',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: 12 }}>
                            {s.startTime?.slice(11, 16)}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {s.patient?.firstName} {s.patient?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {s.therapist?.firstName} {s.therapist?.lastName}
                            {s.room?.name ? ` · ${s.room.name}` : ''}
                            {` · ${s.duration} min`}
                          </Typography>
                        </Box>
                        <Chip label={sc.label} size="small" color={sc.chipColor} variant="outlined" />
                      </Box>
                    );
                  })}
                  {todaySessions.length > 8 && (
                    <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ pt: 0.5 }}>
                      + još {todaySessions.length - 8} tretmana
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2.5}>Pregled dana</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Zakazano', value: scheduled.length, color: '#4A90E2', bg: 'rgba(74,144,226,0.08)' },
                  { label: 'Završeno', value: completed.length, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                  { label: 'Otkazano', value: canceled.length, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
                ].map(item => (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      p: 1.5, borderRadius: 1, bgcolor: item.bg,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="body2" fontWeight={500}>{item.label}</Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>

              {todaySessions.length > 0 && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Stopa završenosti
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ flex: 1, height: 6, borderRadius: '3px', bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{
                        width: `${Math.round((completed.length / todaySessions.length) * 100)}%`,
                        height: '100%', borderRadius: '3px', bgcolor: 'success.main', transition: 'width 0.5s ease',
                      }} />
                    </Box>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {Math.round((completed.length / todaySessions.length) * 100)}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
