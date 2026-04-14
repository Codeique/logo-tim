import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip, Skeleton, Avatar } from '@mui/material';
import { People, EventNote, MeetingRoom, TrendingUp } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';

const STATUS_COLORS = {
  SCHEDULED: { color: 'primary', label: 'Zakazano' },
  COMPLETED: { color: 'success', label: 'Završeno' },
  CANCELED: { color: 'error', label: 'Otkazano' },
};

const StatCard = ({ title, value, icon: Icon, gradient, onClick, loading, subtitle }) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      '&:hover': onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      } : {},
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
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
        <Box sx={{
          width: 48,
          height: 48,
          borderRadius: 1,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ml: 2,
        }}>
          <Icon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče';

  const { data: patients, isLoading: loadingP } = useQuery({
    queryKey: ['patients', { active: true }],
    queryFn: () => api.get('/patients?active=true&limit=1').then(r => r.data),
    enabled: user?.role !== 'PATIENT',
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
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 0.5 }}>
          {greeting}, {displayName} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {format(new Date(), 'EEEE, d. MMMM yyyy.', { locale: srLatn })}
        </Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2.5} mb={3}>
        {user?.role !== 'PATIENT' && (
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
        )}
        <Grid item xs={12} sm={6} lg={user?.role !== 'PATIENT' ? 3 : 4}>
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
        <Grid item xs={12} sm={6} lg={user?.role !== 'PATIENT' ? 3 : 4}>
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
        {/* Today's schedule */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Typography variant="h6" fontWeight={700}>
                  Raspored za danas
                </Typography>
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
                <Box sx={{
                  py: 6,
                  textAlign: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}>
                  <EventNote sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" fontWeight={500}>
                    Nema zakazanih tretmana za danas
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Slobodan dan!
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {todaySessions.slice(0, 8).map((s) => {
                    const sc = STATUS_COLORS[s.status] || { color: 'default', label: s.status };
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'background 0.1s',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{
                          minWidth: 52,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: 'action.selected',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: 12 }}>
                            {s.startTime}
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
                        <Chip
                          label={sc.label}
                          size="small"
                          color={sc.color}
                          variant="outlined"
                        />
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

        {/* Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2.5}>
                Pregled dana
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Zakazano', value: scheduled.length, color: '#4A90E2', bg: 'rgba(74,144,226,0.08)' },
                  { label: 'Završeno', value: completed.length, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                  { label: 'Otkazano', value: canceled.length, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
                ].map(item => (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: item.bg,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: item.color,
                      }} />
                      <Typography variant="body2" fontWeight={500}>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: item.color }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {todaySessions.length > 0 && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Stopa završenosti
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: '3px',
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                    }}>
                      <Box sx={{
                        width: `${Math.round((completed.length / todaySessions.length) * 100)}%`,
                        height: '100%',
                        borderRadius: '3px',
                        bgcolor: 'success.main',
                        transition: 'width 0.5s ease',
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
