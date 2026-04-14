import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  IconButton, Tooltip, Chip, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Skeleton,
} from '@mui/material';
import { Add, Edit, Delete, MeetingRoom } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editRoom
      ? api.put(`/rooms/${editRoom.id}`, data).then(r => r.data)
      : api.post('/rooms', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(editRoom ? 'Prostorija ažurirana' : 'Prostorija dodana');
      setDialogOpen(false);
      setName('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Greška'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Prostorija obrisana');
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Nije moguće obrisati prostoriju koja se koristi'),
  });

  const handleOpen = (room = null) => {
    setEditRoom(room);
    setName(room?.name || '');
    setDialogOpen(true);
  };

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
            <MeetingRoom sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Prostorije ({rooms.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Upravljajte terapijskim prostorijama
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          sx={{ height: 40 }}
        >
          Dodaj prostoriju
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton height={100} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : rooms.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{
              py: 8,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}>
              <MeetingRoom sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography color="text.secondary" fontWeight={500}>
                Nema prostorija
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Dodajte prvu prostoriju klikom na dugme gore
              </Typography>
            </Box>
          </Grid>
        ) : rooms.map(room => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
            <Card sx={{
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              },
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'rgba(74,144,226,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MeetingRoom sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Izmeni">
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(room)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <Edit sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Obriši">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteId(room.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <Delete sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography fontWeight={700} fontSize={15} sx={{ mb: 1 }}>
                  {room.name}
                </Typography>

                <Chip
                  label={room.isActive ? 'Aktivna' : 'Neaktivna'}
                  size="small"
                  color={room.isActive ? 'success' : 'default'}
                  sx={room.isActive ? {
                    bgcolor: 'rgba(16,185,129,0.1)',
                    color: 'success.dark',
                    border: 'none',
                    fontWeight: 600,
                  } : {}}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setName(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>{editRoom ? 'Izmeni prostoriju' : 'Dodaj prostoriju'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Naziv prostorije"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && saveMutation.mutate({ name })}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); setName(''); }} variant="outlined" color="inherit">
            Otkaži
          </Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate({ name })}
            disabled={!name.trim() || saveMutation.isPending}
          >
            {editRoom ? 'Ažuriraj' : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Obriši prostoriju?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Ova akcija ne može biti poništena.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} variant="outlined" color="inherit">Otkaži</Button>
          <Button
            color="error"
            variant="outlined"
            onClick={() => deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            Obriši
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
