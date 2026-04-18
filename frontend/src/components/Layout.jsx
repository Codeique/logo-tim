import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Divider, Tooltip, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Dashboard, People, Person, MeetingRoom, EventNote, CalendarMonth,
  AccountBalance, Receipt, Shield, Assessment, Menu as MenuIcon,
  Brightness4, Brightness7, Logout,
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

const DRAWER_WIDTH = 252;

const navItems = [
  { label: 'Početna', path: '/', icon: Dashboard, roles: ['ADMIN', 'THERAPIST', 'PATIENT'] },
  { label: 'Pacijenti', path: '/patients', icon: People, roles: ['ADMIN', 'THERAPIST', 'PATIENT'] },
  { label: 'Logopedi', path: '/therapists', icon: Person, roles: ['ADMIN'] },
  { label: 'Prostorije', path: '/rooms', icon: MeetingRoom, roles: ['ADMIN'] },
  { label: 'Nedeljni/Dnevni raspored', path: '/calendar', icon: CalendarMonth, roles: ['ADMIN', 'THERAPIST'] },
  // { label: 'Tretmani', path: '/sessions', icon: EventNote, roles: ['ADMIN', 'THERAPIST', 'PATIENT'] },
  { label: 'Transakcije', path: '/transactions', icon: Receipt, roles: ['ADMIN', 'THERAPIST', 'PATIENT'] },
  { label: 'Finansije', path: '/finance', icon: AccountBalance, roles: ['ADMIN', 'THERAPIST'] },
  // { label: 'Vojni zahtevi', path: '/military-requests', icon: Shield, roles: ['ADMIN', 'THERAPIST', 'PATIENT'] },
  // { label: 'Revizija', path: '/audit-logs', icon: Assessment, roles: ['ADMIN'] },
];

export default function Layout({ onToggleTheme, mode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login');
  };

  const visibleNav = navItems.filter(n => n.roles.includes(user?.role));

  const displayName = user?.email?.split('@')[0] || '';
  const initials = displayName?.[0]?.toUpperCase() || '?';

  const isDark = mode === 'dark';
  const activeBg = isDark ? 'rgba(74,144,226,0.14)' : 'rgba(74,144,226,0.08)';
  const activeColor = isDark ? '#5B9BD8' : '#3A7BD5';

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.paper',
    }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 1,
          background: 'linear-gradient(135deg, #4A90E2 0%, #3680C8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 12px rgba(74,144,226,0.35)',
        }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px' }}>LT</Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.4px' }}>
          LogoTim
        </Typography>
        {isMobile && (
          <IconButton
            size="small"
            sx={{ ml: 'auto', color: 'text.secondary' }}
            onClick={() => setDrawerOpen(false)}
          >
            ✕
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 1.5, overflowY: 'auto' }}>
        {visibleNav.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const IconComp = item.icon;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); if (isMobile) setDrawerOpen(false); }}
                sx={{
                  borderRadius: 1,
                  py: 1,
                  px: 1.5,
                  backgroundColor: active ? activeBg : 'transparent',
                  color: active ? activeColor : 'text.secondary',
                  transition: 'all 0.15s ease',
                  '& .MuiListItemIcon-root': {
                    color: active ? activeColor : 'text.secondary',
                  },
                  '&:hover': {
                    backgroundColor: active ? activeBg : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                    color: active ? activeColor : 'text.primary',
                    '& .MuiListItemIcon-root': {
                      color: active ? activeColor : 'text.primary',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <IconComp sx={{ fontSize: 19 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 400,
                    lineHeight: 1.3,
                  }}
                />
                {active && (
                  <Box sx={{
                    width: 3,
                    height: 18,
                    borderRadius: '2px',
                    bgcolor: activeColor,
                    flexShrink: 0,
                    ml: 0.5,
                  }} />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Bottom user section */}
      <Divider sx={{ borderColor: 'divider' }} />
      <Box sx={{ p: 1.5 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          borderRadius: 1,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
          border: '1px solid',
          borderColor: 'divider',
          mb: 1,
        }}>
          <Avatar sx={{
            width: 34,
            height: 34,
            bgcolor: 'primary.main',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
              {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'CHIEF_THERAPIST' ? 'Glavni logoped' : user?.role === 'THERAPIST' ? 'Logoped' : 'Pacijent'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title={mode === 'light' ? 'Tamni način' : 'Svetli način'}>
            <IconButton
              size="small"
              onClick={onToggleTheme}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              {mode === 'dark' ? <Brightness7 sx={{ fontSize: 18 }} /> : <Brightness4 sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Odjavi se">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.light' } }}
            >
              <Logout sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: '56px !important' }}>
            <IconButton edge="start" size="small" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1,
              background: 'linear-gradient(135deg, #4A90E2, #3680C8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 11 }}>LT</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>
              LogoTim
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              border: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Box sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}>
          {drawer}
        </Box>
      )}

      {/* Main content */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        mt: isMobile ? '56px' : 0,
      }}>
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 2.5, md: 3 },
            overflow: 'auto',
            minHeight: '100vh',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
