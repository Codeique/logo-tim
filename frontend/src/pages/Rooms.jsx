import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Tooltip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Skeleton,
  InputAdornment, List, ListItem,
} from '@mui/material';
import { Add, Edit, Delete, MeetingRoom, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => r.data),
  });

  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    return rooms.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [rooms, search]);

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
      {/* ── Header bar ── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2,
          borderRadius: '12px',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(74,144,226,0.18) 0%, rgba(59,130,246,0.10) 100%)'
              : 'linear-gradient(135deg, #E8F4FF 0%, #EEF2FF 100%)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MeetingRoom sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h5" fontWeight={700}>
            Prostorije ({rooms.length})
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          sx={{
            height: 40,
            px: 2.5,
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Dodaj prostoriju
        </Button>
      </Box>

      {/* ── Search ── */}
      <Box sx={{ mb: 2.5, maxWidth: 320 }}>
        <TextField
          fullWidth
          placeholder="Pretraži prostorije..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
            },
          }}
        />
      </Box>

      {/* ── Room list ── */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={52}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : filteredRooms.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <MeetingRoom sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary" fontWeight={500}>
              {search ? 'Nema rezultata pretrage' : 'Nema prostorija'}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {search
                ? 'Pokušajte sa drugim pojmom'
                : 'Dodajte prvu prostoriju klikom na dugme gore'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredRooms.map((room, index) => (
              <ListItem
                key={room.id}
                disablePadding
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2.5,
                  py: 1.5,
                  gap: 2,
                  borderBottom: index < filteredRooms.length - 1
                    ? '1px solid'
                    : 'none',
                  borderColor: 'divider',
                  transition: 'background-color 0.15s ease',
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.025)'
                        : 'rgba(74,144,226,0.03)',
                  },
                }}
              >
                {/* Room icon */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(74,144,226,0.15)'
                        : '#E8F4FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MeetingRoom sx={{ color: 'primary.main', fontSize: 20 }} />
                </Box>

                {/* Room name */}
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {room.name}
                </Typography>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Izmeni">
                    <IconButton
                      size="small"
                      onClick={() => handleOpen(room)}
                      sx={{
                        color: 'primary.main',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(74,144,226,0.1)'
                            : 'rgba(74,144,226,0.06)',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(74,144,226,0.2)'
                              : 'rgba(74,144,226,0.12)',
                        },
                      }}
                    >
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Obriši">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteId(room.id)}
                      sx={{
                        color: 'error.main',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(239,68,68,0.1)'
                            : 'rgba(239,68,68,0.06)',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(239,68,68,0.2)'
                              : 'rgba(239,68,68,0.12)',
                        },
                      }}
                    >
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setName(''); }} maxWidth="xs" fullWidth disableRestoreFocus>
        <DialogTitle>{editRoom ? 'Izmeni prostoriju' : 'Dodaj prostoriju'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Naziv prostorije"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && saveMutation.mutate({ name })}
            autoFocus
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
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
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth disableRestoreFocus>
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
