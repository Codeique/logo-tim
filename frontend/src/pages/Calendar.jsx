import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, IconButton,
  Chip, Tooltip, Select, MenuItem, FormControl,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Add, Today, CalendarMonth } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import api from '../api/axios';
import SessionFormDialog from '../components/SessionFormDialog';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

const STATUS_CONFIG = {
  SCHEDULED: { color: '#4A90E2', bg: 'rgba(74,144,226,0.85)', label: 'Zakazano' },
  COMPLETED: { color: '#10B981', bg: 'rgba(16,185,129,0.85)', label: 'Završeno' },
  CANCELED: { color: '#EF4444', bg: 'rgba(239,68,68,0.7)', label: 'Otkazano' },
};

export default function CalendarPage() {
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = view === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [currentDate];

  const dateFrom = format(days[0], 'yyyy-MM-dd');
  const dateTo = format(days[days.length - 1], 'yyyy-MM-dd');

  const { data } = useQuery({
    queryKey: ['calendar', dateFrom, dateTo],
    queryFn: () => api.get('/sessions', { params: { dateFrom, dateTo, limit: 500 } }).then(r => r.data),
  });

  const sessions = data?.data || [];

  const getSessionsForDayHour = (day, hour) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions.filter(s => {
      // Compare the date portion of the ISO string directly to avoid
      // timezone shifts (new Date('2024-01-15T00:00:00.000Z') is Jan 14
      // in UTC−5, which would place sessions on the wrong day).
      const sessionDayStr = s.date ? s.date.slice(0, 10) : null;
      if (sessionDayStr !== dayStr) return false;
      // Guard against null/undefined startTime (bad data in DB).
      const [h] = (s.startTime || '00:00').split(':').map(Number);
      return h === hour;
    });
  };

  const handleSlotClick = (day, hour) => {
    const slot = { date: format(day, 'yyyy-MM-dd'), startTime: `${String(hour).padStart(2, '0')}:00` };
    setSelectedSlot(slot);
    setSelectedSession(null);
    setFormOpen(true);
  };

  const handleSessionClick = (session, e) => {
    e.stopPropagation();
    setSelectedSession(session);
    setSelectedSlot(null);
    setFormOpen(true);
  };

  const navigate = (dir) => {
    if (view === 'week') {
      setCurrentDate(dir === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
    }
  };

  const dateLabel = view === 'week'
    ? `${format(days[0], 'd. MMM', { locale: srLatn })} – ${format(days[6], 'd. MMM yyyy.', { locale: srLatn })}`
    : format(currentDate, 'EEEE, d. MMMM yyyy.', { locale: srLatn });

  return (
    <Box>
      {/* Page header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: 'action.selected',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CalendarMonth sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Nedeljni raspored
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sessions.length} tretmana u periodu
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date navigation */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            px: 0.5,
            py: 0.25,
          }}>
            <IconButton size="small" onClick={() => navigate('prev')}>
              <ChevronLeft sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center', px: 1 }}>
              {dateLabel}
            </Typography>
            <IconButton size="small" onClick={() => navigate('next')}>
              <ChevronRight sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          <Button
            size="small"
            startIcon={<Today sx={{ fontSize: 16 }} />}
            onClick={() => setCurrentDate(new Date())}
            variant="outlined"
            sx={{ height: 36 }}
          >
            Danas
          </Button>

          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select value={view} onChange={e => setView(e.target.value)}>
              <MenuItem value="week">Nedeljni</MenuItem>
              <MenuItem value="day">Dnevni</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setSelectedSlot(null); setSelectedSession(null); setFormOpen(true); }}
            sx={{ height: 36 }}
          >
            Zakaži
          </Button>
        </Box>
      </Box>

      {/* Status legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.color }} />
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {cfg.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: view === 'week' ? 800 : 420 }}>
            {/* Header row */}
            <Box sx={{
              display: 'flex',
              borderBottom: '2px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}>
              <Box sx={{
                width: 64,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
              }} />
              {days.map(day => {
                const isToday = isSameDay(day, new Date());
                return (
                  <Box
                    key={day.toISOString()}
                    sx={{
                      flex: 1,
                      p: 1.5,
                      textAlign: 'center',
                      bgcolor: isToday ? 'rgba(74,144,226,0.06)' : 'transparent',
                      borderRight: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderRight: 0 },
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      fontWeight={500}
                      sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}
                    >
                      {format(day, 'EEE', { locale: srLatn })}
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={isToday ? 800 : 500}
                      color={isToday ? 'primary.main' : 'text.primary'}
                      sx={{ fontSize: isToday ? 16 : 14 }}
                    >
                      {format(day, 'd')}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Time grid */}
            {HOURS.map(hour => (
              <Box
                key={hour}
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minHeight: 68,
                }}
              >
                {/* Hour label */}
                <Box sx={{
                  width: 64,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  pt: 1,
                  px: 1,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, fontWeight: 500 }}>
                    {String(hour).padStart(2, '0')}:00
                  </Typography>
                </Box>

                {/* Day columns */}
                {days.map(day => {
                  const daySessions = getSessionsForDayHour(day, hour);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <Box
                      key={day.toISOString()}
                      onClick={() => handleSlotClick(day, hour)}
                      sx={{
                        flex: 1,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderRight: 0 },
                        p: 0.5,
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                        bgcolor: isToday ? 'rgba(74,144,226,0.02)' : 'transparent',
                        '&:hover': { bgcolor: isToday ? 'rgba(74,144,226,0.05)' : 'action.hover' },
                        minHeight: 68,
                      }}
                    >
                      {daySessions.map(s => {
                        const sc = STATUS_CONFIG[s.status] || { bg: '#64748B', label: s.status };
                        return (
                          <Tooltip
                            key={s.id}
                            title={`${s.patient?.firstName} ${s.patient?.lastName} · ${s.therapist?.firstName} ${s.therapist?.lastName}${s.room ? ` · ${s.room.name}` : ''} · ${s.duration}min`}
                          >
                            <Box
                              onClick={(e) => handleSessionClick(s, e)}
                              sx={{
                                bgcolor: sc.bg,
                                color: 'white',
                                borderRadius: 1,
                                p: '3px 6px',
                                mb: 0.5,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity: s.status === 'CANCELED' ? 0.5 : 1,
                                transition: 'opacity 0.15s, transform 0.1s',
                                '&:hover': {
                                  opacity: s.status === 'CANCELED' ? 0.6 : 0.88,
                                  transform: 'scale(1.01)',
                                },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                lineHeight: 1.4,
                              }}
                            >
                              {s.startTime} {s.patient?.firstName} {s.patient?.lastName}
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Card>

      <SessionFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelectedSlot(null); setSelectedSession(null); }}
        session={selectedSession}
        defaultSlot={selectedSlot}
      />
    </Box>
  );
}
