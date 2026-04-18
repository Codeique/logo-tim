import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip, MenuItem, Skeleton, Pagination,
  Select, FormControl, InputLabel,
} from '@mui/material';
import { Add, Edit, Cancel, CheckCircle, EventNote } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import SessionFormDialog from '../components/SessionFormDialog';
import { SESSION_STATUS } from '../utils/statusConfig';

export default function SessionsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '' });
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', filters, page],
    queryFn: () => api.get('/sessions', {
      params: {
        ...filters,
        page,
        limit: LIMIT,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        status: filters.status || undefined,
      },
    }).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/sessions/${id}`, { status }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Tretman ažuriran');
    },
    onError: () => toast.error('Greška pri ažuriranju'),
  });

  const sessions = data?.data || [];
  const total = data?.total || 0;

  const clearFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', status: '' });
    setPage(1);
  };

  const hasFilters = filters.dateFrom || filters.dateTo || filters.status;

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
            <EventNote sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Tretmani ({total})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pregled i upravljanje tretmanima
            </Typography>
          </Box>
        </Box>
        {['ADMIN', 'THERAPIST'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setEditSession(null); setFormOpen(true); }}
            sx={{ height: 40 }}
          >
            Zakaži tretman
          </Button>
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Filters */}
          <Box sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            <TextField
              type="date"
              label="Od datuma"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              label="Do datuma"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="">Svi</MenuItem>
                <MenuItem value="SCHEDULED">Zakazano</MenuItem>
                <MenuItem value="COMPLETED">Završeno</MenuItem>
                <MenuItem value="CANCELED">Otkazano</MenuItem>
              </Select>
            </FormControl>
            {hasFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearFilters}
                sx={{ height: 37 }}
              >
                Obriši filtere
              </Button>
            )}
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Vreme</TableCell>
                  <TableCell>Pacijent</TableCell>
                  <TableCell>Logoped</TableCell>
                  <TableCell>Prostorija</TableCell>
                  <TableCell>Trajanje</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Plaćeno</TableCell>
                  {['ADMIN', 'THERAPIST'].includes(user?.role) && <TableCell align="right">Akcije</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <EventNote sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" fontWeight={500}>
                          Nema pronađenih tretmana
                        </Typography>
                        {hasFilters && (
                          <Typography variant="caption" color="text.disabled">
                            Pokušajte sa drugim filterima
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : sessions.map(s => {
                  const sc = SESSION_STATUS[s.status] || { chipColor: 'default', label: s.status };
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {format(new Date(s.date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.startTime}
                          size="small"
                          sx={{ bgcolor: 'action.selected', color: 'primary.main', fontWeight: 600, border: 'none', fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {s.patient?.firstName} {s.patient?.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {s.therapist?.firstName} {s.therapist?.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {s.room?.name || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{s.duration} min</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sc.label}
                          size="small"
                          color={sc.chipColor}
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
                      {['ADMIN', 'THERAPIST'].includes(user?.role) && (
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                            <Tooltip title="Izmeni">
                              <IconButton
                                size="small"
                                onClick={() => { setEditSession(s); setFormOpen(true); }}
                                sx={{ color: 'text.secondary' }}
                              >
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {s.status === 'SCHEDULED' && (
                              <>
                                <Tooltip title="Označi kao završeno">
                                  <IconButton
                                    size="small"
                                    onClick={() => updateStatus.mutate({ id: s.id, status: 'COMPLETED' })}
                                    sx={{ color: 'success.main' }}
                                  >
                                    <CheckCircle sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Otkaži">
                                  <IconButton
                                    size="small"
                                    onClick={() => updateStatus.mutate({ id: s.id, status: 'CANCELED' })}
                                    sx={{ color: 'error.main' }}
                                  >
                                    <Cancel sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {total > LIMIT && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Pagination
                count={Math.ceil(total / LIMIT)}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <SessionFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSession(null); }}
        session={editSession}
      />
    </Box>
  );
}
