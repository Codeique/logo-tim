import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Skeleton, IconButton, Tooltip,
} from '@mui/material';
import { Add, Edit, Shield } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import MilitaryRequestDialog from '../components/MilitaryRequestDialog';
import { computeRequestStatus, requestStatusColor, requestStatusLabel } from '../utils/militaryStatus';

export default function MilitaryRequestsPage() {
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['militaryRequests'],
    queryFn: () => api.get('/military-requests').then(r => r.data),
  });

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
            bgcolor: 'rgba(245,158,11,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield sx={{ color: 'warning.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Vojni zahtevi ({requests.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Vojni zahtevi i statusi
            </Typography>
          </Box>
        </Box>
        {['ADMIN', 'THERAPIST'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setEditRequest(null); setFormOpen(true); }}
            sx={{ height: 40 }}
          >
            Novi zahtev
          </Button>
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Zahtev #</TableCell>
                  <TableCell>Pacijent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Iskorišćeno</TableCell>
                  <TableCell>Važi od</TableCell>
                  <TableCell>Važi do</TableCell>
                  <TableCell>Preostalo dana</TableCell>
                  <TableCell>Napomena</TableCell>
                  {['ADMIN', 'THERAPIST'].includes(user?.role) && <TableCell align="right">Akcije</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Shield sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" fontWeight={500}>
                          Nema vojnih zahteva
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : requests.map(r => {
                  const status = computeRequestStatus(r.validFrom, r.validUntil);
                  const daysLeft = differenceInCalendarDays(new Date(r.validUntil), new Date());
                  const rowBg = status === 'INACTIVE'
                    ? 'rgba(239,68,68,0.04)'
                    : status === 'ACTIVE_WARNING'
                      ? 'rgba(245,158,11,0.04)'
                      : 'inherit';

                  return (
                    <TableRow key={r.id} hover sx={{ bgcolor: rowBg }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {r.requestNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {r.patient?.firstName} {r.patient?.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={requestStatusLabel(status)}
                          size="small"
                          color={requestStatusColor(status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {r.usedSessions}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            / {r.totalSessions}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(r.validFrom), 'dd.MM.yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(r.validUntil), 'dd.MM.yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {status !== 'INACTIVE' && (
                          <Chip
                            label={daysLeft <= 0 ? 'Ističe danas' : `${daysLeft} dana`}
                            size="small"
                            color={requestStatusColor(status)}
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {r.note || '—'}
                        </Typography>
                      </TableCell>
                      {['ADMIN', 'THERAPIST'].includes(user?.role) && (
                        <TableCell align="right">
                          <Tooltip title="Izmeni">
                            <IconButton
                              size="small"
                              onClick={() => { setEditRequest(r); setFormOpen(true); }}
                              sx={{ color: 'text.secondary' }}
                            >
                              <Edit sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <MilitaryRequestDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRequest(null); }}
        request={editRequest}
      />
    </Box>
  );
}
