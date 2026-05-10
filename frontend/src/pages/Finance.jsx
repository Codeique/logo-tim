import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Skeleton, Grid, Select, MenuItem, FormControl, InputLabel,
  TablePagination,
} from '@mui/material';
import { AccountBalance, TrendingUp, Person } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api/axios';
import { formatCurrency } from '../utils/currency';
import { SESSION_STATUS } from '../utils/statusConfig';
import useAuthStore from '../store/authStore';

const SummaryCard = ({ title, value, icon: Icon, color, gradient }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} color={color} sx={{ mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{
          width: 44,
          height: 44,
          borderRadius: 1,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

function TherapistEarningsView() {
  const firstDayOfMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  const [filters, setFilters] = useState({ dateFrom: firstDayOfMonth, dateTo: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['finance-my-earnings', filters, page, rowsPerPage],
    queryFn: () => api.get('/finance', {
      params: {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: page + 1,
        limit: rowsPerPage,
      },
    }).then(r => r.data),
  });

  const records = data?.data || [];
  const total = data?.total || 0;
  const totalsPaid = data?.totalsPaid || {};

  const handleFilterChange = (field) => (e) => {
    setFilters(f => ({ ...f, [field]: e.target.value }));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 1, bgcolor: 'action.selected',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AccountBalance sx={{ color: 'primary.main', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>Moja zarada</Typography>
          <Typography variant="caption" color="text.secondary">{total} zapisa</Typography>
        </Box>
      </Box>

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6}>
          {isLoading ? (
            <Card><CardContent><Skeleton height={60} /></CardContent></Card>
          ) : (
            <SummaryCard
              title="Ukupna zarada (naplaćeno)"
              value={formatCurrency(totalsPaid.therapistEarning || 0)}
              icon={Person}
              color="primary.main"
              gradient="linear-gradient(135deg, #4A90E2, #6BA3E8)"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          {isLoading ? (
            <Card><CardContent><Skeleton height={60} /></CardContent></Card>
          ) : (
            <SummaryCard
              title="Broj terapija"
              value={total}
              icon={TrendingUp}
              color="success.main"
              gradient="linear-gradient(135deg, #10B981, #34D399)"
            />
          )}
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{
            display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
            p: 2, borderBottom: '1px solid', borderColor: 'divider',
          }}>
            <TextField
              type="date" label="Od datuma" size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={handleFilterChange('dateFrom')}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date" label="Do datuma" size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={handleFilterChange('dateTo')}
              sx={{ minWidth: 160 }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Vreme</TableCell>
                  <TableCell>Pacijent</TableCell>
                  <TableCell>Sala</TableCell>
                  <TableCell>Trajanje</TableCell>
                  <TableCell>Vrsta terapije</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Naplata</TableCell>
                  <TableCell align="right">Zarada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(rowsPerPage > 10 ? 10 : rowsPerPage)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <AccountBalance sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" fontWeight={500}>
                          Nema finansijskih zapisa
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : records.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {format(new Date(r.session?.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell>{r.session?.startTime}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.session?.patient?.firstName} {r.session?.patient?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {r.session?.room?.name || 'Nije dodeljena'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.session?.duration} min</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {r.session?.treatmentType || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(SESSION_STATUS[r.session?.status] ?? SESSION_STATUS.SCHEDULED).label}
                        size="small"
                        color={(SESSION_STATUS[r.session?.status] ?? SESSION_STATUS.SCHEDULED).chipColor}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.session?.isPaid ? 'Naplaćeno' : 'Nije naplaćeno'}
                        size="small"
                        color={r.session?.isPaid ? 'success' : 'warning'}
                        variant={r.session?.isPaid ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color={r.session?.isPaid ? 'primary.main' : 'warning.main'}
                        sx={{ opacity: r.session?.isPaid ? 1 : 0.75 }}>
                        {formatCurrency(r.therapistEarning)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Zapisa po stranici:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} od ${count}`}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default function FinancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const firstDayOfMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  const [filters, setFilters] = useState({ dateFrom: firstDayOfMonth, dateTo: '', therapistId: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: therapistsData } = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.get('/therapists').then(r => r.data),
    enabled: isAdmin,
  });
  const therapists = Array.isArray(therapistsData) ? therapistsData : (therapistsData?.data || []);

  const { data, isLoading } = useQuery({
    queryKey: ['finance', filters, page, rowsPerPage],
    queryFn: () => api.get('/finance', {
      params: {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        therapistId: filters.therapistId || undefined,
        page: page + 1,
        limit: rowsPerPage,
      },
    }).then(r => r.data),
    enabled: isAdmin,
  });

  if (!isAdmin) return <TherapistEarningsView />;

  const records = data?.data || [];
  const total = data?.total || 0;
  const totalsPaid = data?.totalsPaid || {};

  const handleFilterChange = (field) => (e) => {
    setFilters(f => ({ ...f, [field]: e.target.value }));
    setPage(0);
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{
          width: 40,
          height: 40,
          borderRadius: 1,
          bgcolor: 'action.selected',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AccountBalance sx={{ color: 'primary.main', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Finansije
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total} zapisa
          </Typography>
        </Box>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6}>
          {isLoading ? (
            <Card><CardContent><Skeleton height={60} /></CardContent></Card>
          ) : (
            <SummaryCard
              title="Ukupna zarada terapeuta"
              value={formatCurrency(totalsPaid.therapistEarning || 0)}
              icon={Person}
              color="primary.main"
              gradient="linear-gradient(135deg, #4A90E2, #6BA3E8)"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          {isLoading ? (
            <Card><CardContent><Skeleton height={60} /></CardContent></Card>
          ) : (
            <SummaryCard
              title="Ukupan prihod firme"
              value={formatCurrency(totalsPaid.companyIncome || 0)}
              icon={TrendingUp}
              color="success.main"
              gradient="linear-gradient(135deg, #10B981, #34D399)"
            />
          )}
        </Grid>
      </Grid>

      {/* Records table */}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Terapeut</InputLabel>
              <Select
                value={filters.therapistId}
                label="Terapeut"
                onChange={handleFilterChange('therapistId')}
              >
                <MenuItem value="">Svi terapeuti</MenuItem>
                {therapists.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="Od datuma"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={handleFilterChange('dateFrom')}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              label="Do datuma"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={handleFilterChange('dateTo')}
              sx={{ minWidth: 160 }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Pacijent</TableCell>
                  <TableCell>Terapeut</TableCell>
                  <TableCell>Trajanje</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Naplata</TableCell>
                  <TableCell align="right">Zarada terapeuta</TableCell>
                  <TableCell align="right">Prihod firme</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(rowsPerPage > 10 ? 10 : rowsPerPage)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <AccountBalance sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" fontWeight={500}>
                          Nema finansijskih zapisa
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : records.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {format(new Date(r.session?.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.session?.patient?.firstName} {r.session?.patient?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {r.therapist?.firstName} {r.therapist?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.session?.duration} min</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(SESSION_STATUS[r.session?.status] ?? SESSION_STATUS.SCHEDULED).label}
                        size="small"
                        color={(SESSION_STATUS[r.session?.status] ?? SESSION_STATUS.SCHEDULED).chipColor}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.session?.isPaid ? 'Naplaćeno' : 'Nije naplaćeno'}
                        size="small"
                        color={r.session?.isPaid ? 'success' : 'warning'}
                        variant={r.session?.isPaid ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color={r.session?.isPaid ? 'primary.main' : 'warning.main'}
                        sx={{ opacity: r.session?.isPaid ? 1 : 0.75 }}>
                        {formatCurrency(r.therapistEarning)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color={r.session?.isPaid ? 'success.main' : 'warning.main'}
                        sx={{ opacity: r.session?.isPaid ? 1 : 0.75 }}>
                        {formatCurrency(r.companyIncome)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Zapisa po stranici:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} od ${count}`}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
