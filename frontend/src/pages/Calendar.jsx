import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, Button, IconButton,
  Tooltip, Select, MenuItem, FormControl,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Add, Today, CalendarMonth } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import api from '../api/axios';
import SessionFormDialog from '../components/SessionFormDialog';
import { SESSION_STATUS } from '../utils/statusConfig';
import useAuthStore from '../store/authStore';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const ROW_HEIGHT = 68;

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

  const { data: sessionsData } = useQuery({
    queryKey: ['calendar', dateFrom, dateTo],
    queryFn: () => api.get('/sessions', { params: { dateFrom, dateTo, limit: 500 } }).then(r => r.data),
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => r.data),
  });

  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const { data: therapistsData } = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.get('/therapists').then(r => r.data),
    enabled: !isAdmin,
  });

  const sessions = sessionsData?.data || [];
  const activeRooms = useMemo(() => (roomsData || []).filter(r => r.isActive), [roomsData]);

  const dayViewRooms = useMemo(() => {
    if (isAdmin) return activeRooms;
    const myTherapist = (therapistsData || []).find(t => t.userId === user?.id);
    if (!myTherapist) return activeRooms;
    const myRoomIds = new Set((myTherapist.rooms || []).map(r => r.id));
    return activeRooms.filter(r => myRoomIds.has(r.id));
  }, [activeRooms, therapistsData, isAdmin, user?.id]);

  const getSessionsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions.filter(s => {
      if (s.date?.slice(0, 10) !== dayStr) return false;
      const [h] = (s.startTime ? s.startTime.slice(11, 16) : '00:00').split(':').map(Number);
      return h >= HOURS[0] && h <= HOURS[HOURS.length - 1];
    });
  };

  const getSessionsForDayAndRoom = (day, roomId) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions.filter(s => {
      if (s.date?.slice(0, 10) !== dayStr) return false;
      if (s.roomId !== roomId) return false;
      const [h] = (s.startTime ? s.startTime.slice(11, 16) : '00:00').split(':').map(Number);
      return h >= HOURS[0] && h <= HOURS[HOURS.length - 1];
    });
  };

  const getSessionTop = (session) => {
    const [h, m] = (session.startTime ? session.startTime.slice(11, 16) : '00:00').split(':').map(Number);
    return (h - HOURS[0]) * ROW_HEIGHT + (m / 60) * ROW_HEIGHT;
  };

  const getSessionHeight = (session) => {
    const duration = session.duration || 60;
    return Math.max((duration / 60) * ROW_HEIGHT, 22);
  };

  const getTimeMinutes = (session) => {
    const [h, m] = (session.startTime ? session.startTime.slice(11, 16) : '00:00').split(':').map(Number);
    return h * 60 + m;
  };

  const sessionOverlaps = (a, b) => {
    const aStart = getTimeMinutes(a);
    const bStart = getTimeMinutes(b);
    return aStart < bStart + (b.duration || 60) && bStart < aStart + (a.duration || 60);
  };

  const layoutSessions = (sessions) => {
    if (!sessions.length) return [];
    const sorted = [...sessions].sort((a, b) => getTimeMinutes(a) - getTimeMinutes(b));
    const cols = [];
    const assignments = new Map();
    for (const s of sorted) {
      const sStart = getTimeMinutes(s);
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        const last = cols[c][cols[c].length - 1];
        if (sStart >= getTimeMinutes(last) + (last.duration || 60)) {
          cols[c].push(s);
          assignments.set(s, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        assignments.set(s, cols.length);
        cols.push([s]);
      }
    }
    return sorted.map(s => ({
      session: s,
      subCol: assignments.get(s),
      subNumCols: cols.filter(col => col.some(other => sessionOverlaps(s, other))).length,
    }));
  };

  const handleSlotClick = (day, hour, roomId = null) => {
    const slot = {
      date: format(day, 'yyyy-MM-dd'),
      startTime: `${String(hour).padStart(2, '0')}:00`,
      ...(roomId != null ? { roomId } : {}),
    };
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

  const pageTitle = view === 'week' ? 'Nedeljni raspored' : 'Dnevni raspored';

  const sessionCard = (s, outerCol, outerNumCols, subCol = 0, subNumCols = 1) => {
    const sc = SESSION_STATUS[s.status] || { bg: '#64748B', label: s.status };
    const outerWidthPct = 100 / outerNumCols;
    const subWidthPct = outerWidthPct / subNumCols;
    const leftPct = outerCol * outerWidthPct + subCol * subWidthPct;
    return (
      <Tooltip
        key={s.id}
        title={`${s.patient?.firstName} ${s.patient?.lastName} · ${s.therapist?.firstName} ${s.therapist?.lastName}${s.room ? ` · ${s.room.name}` : ''} · ${s.duration}min`}
      >
        <Box
          onClick={(e) => handleSessionClick(s, e)}
          sx={{
            position: 'absolute',
            top: getSessionTop(s),
            left: `calc(${leftPct}% + 2px)`,
            width: `calc(${subWidthPct}% - 4px)`,
            height: getSessionHeight(s),
            bgcolor: sc.bg,
            color: 'white',
            borderRadius: 1,
            px: '6px',
            py: '3px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            pointerEvents: 'auto',
            opacity: s.status === 'CANCELED' ? 0.5 : 1,
            overflow: 'hidden',
            lineHeight: 1.4,
            zIndex: 1,
            boxSizing: 'border-box',
            transition: 'opacity 0.15s, transform 0.1s',
            borderLeft: s.status === 'COMPLETED' && !s.isPaid ? '3px solid #F59E0B' : undefined,
            '&:hover': {
              opacity: s.status === 'CANCELED' ? 0.6 : 0.88,
              transform: 'scale(1.01)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.startTime?.slice(11, 16)} {s.patient?.firstName} {s.patient?.lastName}
            </Box>
            {s.status === 'COMPLETED' && !s.isPaid && (
              <Box component="span" sx={{ flexShrink: 0, fontSize: 10, bgcolor: '#F59E0B', color: '#fff', borderRadius: '3px', px: '3px', lineHeight: '14px', fontWeight: 700 }}>
                €
              </Box>
            )}
          </Box>
          {s.status === 'COMPLETED' && !s.isPaid && getSessionHeight(s) >= 36 && (
            <Box sx={{ fontSize: 10, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mt: '1px' }}>
              Nije naplaćeno
            </Box>
          )}
        </Box>
      </Tooltip>
    );
  };

  const renderWeekGrid = () => (
    <Box sx={{ minWidth: 800 }}>
      <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Box sx={{ width: 64, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.default' }} />
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          return (
            <Box
              key={day.toISOString()}
              sx={{
                flex: 1, p: 1.5, textAlign: 'center',
                bgcolor: isToday ? 'rgba(74,144,226,0.06)' : 'transparent',
                borderRight: '1px solid', borderColor: 'divider',
                '&:last-child': { borderRight: 0 },
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={500}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                {format(day, 'EEE', { locale: srLatn })}
              </Typography>
              <Typography variant="body1" fontWeight={isToday ? 800 : 500}
                color={isToday ? 'primary.main' : 'text.primary'}
                sx={{ fontSize: isToday ? 16 : 14 }}>
                {format(day, 'd')}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex' }}>
        <Box sx={{ width: 64, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.default', position: 'sticky', left: 0, zIndex: 2 }}>
          {HOURS.map(hour => (
            <Box key={hour} sx={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'flex-start', pt: 1, px: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, fontWeight: 500 }}>
                {String(hour).padStart(2, '0')}:00
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1, position: 'relative' }}>
          {HOURS.map(hour => (
            <Box key={hour} sx={{ display: 'flex', height: ROW_HEIGHT, borderBottom: '1px solid', borderColor: 'divider' }}>
              {days.map(day => {
                const isToday = isSameDay(day, new Date());
                return (
                  <Box
                    key={day.toISOString()}
                    onClick={() => handleSlotClick(day, hour)}
                    sx={{
                      flex: 1, borderRight: '1px solid', borderColor: 'divider',
                      '&:last-child': { borderRight: 0 }, cursor: 'pointer',
                      transition: 'background 0.1s',
                      bgcolor: isToday ? 'rgba(74,144,226,0.02)' : 'transparent',
                      '&:hover': { bgcolor: isToday ? 'rgba(74,144,226,0.05)' : 'action.hover' },
                    }}
                  />
                );
              })}
            </Box>
          ))}

          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            {days.map((day, dayIndex) =>
              layoutSessions(getSessionsForDay(day)).map(({ session: s, subCol, subNumCols }) =>
                sessionCard(s, dayIndex, days.length, subCol, subNumCols)
              )
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderDayGrid = () => {
    const columns = dayViewRooms;
    const numCols = columns.length || 1;

    return (
      <Box sx={{ minWidth: Math.max(420, numCols * 180) }}>
        <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Box sx={{ width: 64, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.default' }} />
          {columns.length === 0 ? (
            <Box sx={{ flex: 1, p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Nema prostorija</Typography>
            </Box>
          ) : columns.map(room => (
            <Box
              key={room.id}
              sx={{
                flex: 1, p: 1.5, textAlign: 'center',
                borderRight: '1px solid', borderColor: 'divider',
                '&:last-child': { borderRight: 0 },
              }}
            >
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {room.name}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box sx={{ width: 64, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.default', position: 'sticky', left: 0, zIndex: 2 }}>
            {HOURS.map(hour => (
              <Box key={hour} sx={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'flex-start', pt: 1, px: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, fontWeight: 500 }}>
                  {String(hour).padStart(2, '0')}:00
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1, position: 'relative' }}>
            {HOURS.map(hour => (
              <Box key={hour} sx={{ display: 'flex', height: ROW_HEIGHT, borderBottom: '1px solid', borderColor: 'divider' }}>
                {columns.map(room => (
                  <Box
                    key={room.id}
                    onClick={() => handleSlotClick(currentDate, hour, room.id)}
                    sx={{
                      flex: 1, borderRight: '1px solid', borderColor: 'divider',
                      '&:last-child': { borderRight: 0 }, cursor: 'pointer',
                      transition: 'background 0.1s',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  />
                ))}
              </Box>
            ))}

            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
              {columns.map((room, colIndex) =>
                layoutSessions(getSessionsForDayAndRoom(currentDate, room.id)).map(({ session: s, subCol, subNumCols }) =>
                  sessionCard(s, colIndex, numCols, subCol, subNumCols)
                )
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        mb: 3, flexWrap: 'wrap', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 1, bgcolor: 'action.selected',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CalendarMonth sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {pageTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sessions.length} tretmana u periodu
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'background.paper',
            border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 0.5, py: 0.25,
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

      <Card variant="outlined" sx={{ mb: 2, px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
              Status tretmana
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {Object.entries(SESSION_STATUS).map(([key, cfg]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: cfg.bg, flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>{cfg.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ width: '1px', bgcolor: 'divider', alignSelf: 'stretch', display: { xs: 'none', sm: 'block' } }} />

          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
              Oznake na kartici
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 3, height: 16, bgcolor: '#F59E0B', borderRadius: '2px', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Nije naplaćeno</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box component="span" sx={{ fontSize: 10, bgcolor: '#F59E0B', color: '#fff', borderRadius: '3px', px: '4px', lineHeight: '16px', fontWeight: 700 }}>€</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Oznaka neplaćenog tretmana</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: '1px', bgcolor: 'divider', alignSelf: 'stretch', display: { xs: 'none', sm: 'block' } }} />

          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
              Interakcija
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: '1.5px dashed', borderColor: 'text.disabled', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Klik na slobodan slot → zakaži tretman</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'action.selected', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Klik na karticu → izmeni tretman</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.25, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Plava kolona = današnji dan</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          {view === 'week' ? renderWeekGrid() : renderDayGrid()}
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
