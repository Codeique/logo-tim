import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Skeleton, Pagination, MenuItem, Select, FormControl,
  InputLabel, InputAdornment,
} from '@mui/material';
import { Add, Search, Receipt, TrendingUp, TrendingDown } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api/axios';
import { formatCurrency } from '../utils/currency';
import useAuthStore from '../store/authStore';
import AddTransactionDialog from '../components/AddTransactionDialog';

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '', search: '' });
  const [page, setPage] = useState(1);
  const [txOpen, setTxOpen] = useState(false);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => api.get('/transactions', {
      params: {
        page,
        limit: LIMIT,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        type: filters.type || undefined,
        search: filters.search || undefined,
      },
    }).then(r => r.data),
  });

  const transactions = data?.data || [];
  const total = data?.total || 0;

  const hasFilters = filters.dateFrom || filters.dateTo || filters.type || filters.search;

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
            <Receipt sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Transakcije ({total})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pregled uplata i povrata
            </Typography>
          </Box>
        </Box>
        {['ADMIN', 'THERAPIST'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setTxOpen(true)}
            sx={{ height: 40 }}
          >
            Dodaj uplatu
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
              placeholder="Pretraži pacijenta..."
              size="small"
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
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
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Tip</InputLabel>
              <Select
                label="Tip"
                value={filters.type}
                onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}
              >
                <MenuItem value="">Sve</MenuItem>
                <MenuItem value="PAYMENT">Uplata</MenuItem>
                <MenuItem value="REFUND">Povrat</MenuItem>
              </Select>
            </FormControl>
            {hasFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => { setFilters({ dateFrom: '', dateTo: '', type: '', search: '' }); setPage(1); }}
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
                  <TableCell>Datum / Vreme</TableCell>
                  <TableCell>Pacijent</TableCell>
                  <TableCell align="right">Iznos</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Uneo</TableCell>
                  <TableCell>Napomena</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Receipt sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" fontWeight={500}>
                          Nema transakcija
                        </Typography>
                        {hasFilters && (
                          <Typography variant="caption" color="text.disabled">
                            Pokušajte sa drugim filterima
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : transactions.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {format(new Date(t.createdAt), 'dd.MM.yyyy')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(t.createdAt), 'HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {t.patient?.firstName} {t.patient?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {t.type === 'REFUND'
                          ? <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />
                          : <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
                        }
                        <Typography
                          fontWeight={700}
                          sx={{ color: t.type === 'REFUND' ? 'error.main' : 'success.main' }}
                        >
                          {t.type === 'REFUND' ? '-' : '+'}{formatCurrency(t.amount)}
                        </Typography>
                      </Box>
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
                      <Typography variant="body2" color="text.secondary">
                        {t.createdBy?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {t.note || '—'}
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

      <AddTransactionDialog open={txOpen} onClose={() => setTxOpen(false)} />
    </Box>
  );
}
