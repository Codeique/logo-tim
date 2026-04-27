import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Skeleton, Pagination, Grid,
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
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['finance-my-earnings', filters],
    queryFn: () => api.get('/finance', {
      params: {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        limit: 1,
      },
    }).then(r => r.data),
  });

  const totalsPaid = data?.totalsPaid || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 1, bgcolor: 'action.selected',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AccountBalance sx={{ color: 'primary.main', fontSize: 22 }} />
        </Box>
        <Typography variant="h5" fontWeight={700}>Moja zarada</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          type="date" label="Od datuma" size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.dateFrom}
          onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
          sx={{ minWidth: 160 }}
        />
        <TextField
          type="date" label="Do datuma" size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.dateTo}
          onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
          sx={{ minWidth: 160 }}
        />
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={4}>
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
      </Grid>
    </Box>
  );
}

export default function FinancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['finance', filters, page],
    queryFn: () => api.get('/finance', {
      params: {
        ...filters,
        page,
        limit: LIMIT,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
    }).then(r => r.data),
    enabled: isAdmin,
  });

  if (!isAdmin) return <TherapistEarningsView />;

  const records = data?.data || [];
  const total = data?.total || 0;
  const totalsPaid = data?.totalsPaid || {};

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
          <SummaryCard
            title="Ukupna zarada terapeuta"
            value={formatCurrency(totalsPaid.therapistEarning || 0)}
            icon={Person}
            color="primary.main"
            gradient="linear-gradient(135deg, #4A90E2, #6BA3E8)"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <SummaryCard
            title="Ukupan prihod firme"
            value={formatCurrency(totalsPaid.companyIncome || 0)}
            icon={TrendingUp}
            color="success.main"
            gradient="linear-gradient(135deg, #10B981, #34D399)"
          />
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
            <TextField
              type="date"
              label="Od datuma"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              label="Do datuma"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
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
                  [...Array(10)].map((_, i) => (
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
    </Box>
  );
}
