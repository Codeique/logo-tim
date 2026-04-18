import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Pagination, Chip, Avatar,
} from '@mui/material';
import { Assessment } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api/axios';
import { ACTION_CONFIG, ROLE_CONFIG } from '../utils/statusConfig';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page],
    queryFn: () => api.get('/audit-logs', { params: { page, limit: LIMIT } }).then(r => r.data),
  });

  const logs = data?.data || [];
  const total = data?.total || 0;

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
          <Assessment sx={{ color: 'primary.main', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Revizija sistema
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total} unosa ukupno
          </Typography>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum i vreme</TableCell>
                  <TableCell>Korisnik</TableCell>
                  <TableCell>Akcija</TableCell>
                  <TableCell>Entitet</TableCell>
                  <TableCell>ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Assessment sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" fontWeight={500}>
                          Nema zapisa revizije
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : logs.map(log => {
                  const ac = ACTION_CONFIG[log.action] || { color: 'default', label: log.action };
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {format(new Date(log.createdAt), 'dd.MM.yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{
                            width: 28,
                            height: 28,
                            bgcolor: 'primary.main',
                            fontSize: 11,
                            fontWeight: 700,
                          }}>
                            {log.user?.email?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>
                              {log.user?.email}
                            </Typography>
                            <Chip
                              label={(ROLE_CONFIG[log.user?.role] ?? ROLE_CONFIG.PATIENT).label}
                              size="small"
                              variant="outlined"
                              sx={{ height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ac.label}
                          size="small"
                          color={ac.color}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {log.entity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {log.entityId ? `#${log.entityId}` : '—'}
                        </Typography>
                      </TableCell>
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
    </Box>
  );
}
