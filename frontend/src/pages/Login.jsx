import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link,
  Fade,
  Slide,
  Alert,
  useMediaQuery,
  useTheme,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import getTheme from '../theme';
import loginImg from '../assets/images/loginImg.jpg';

/* ─── Logo SVG ─────────────────────────────────────────────────────────────── */
function LogoIcon({ size = 72 }) {
  return (
    <Box
      component="img"
      src={`data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
          <!-- head silhouette -->
          <ellipse cx="50" cy="38" rx="24" ry="28" fill="none" stroke="#4A90D9" stroke-width="3.5"/>
          <!-- brain tree branches -->
          <line x1="50" y1="22" x2="50" y2="10" stroke="#4A90D9" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="50" y1="16" x2="42" y2="8" stroke="#4A90D9" stroke-width="2" stroke-linecap="round"/>
          <line x1="50" y1="16" x2="58" y2="8" stroke="#4A90D9" stroke-width="2" stroke-linecap="round"/>
          <line x1="42" y1="8" x2="38" y2="4" stroke="#4A90D9" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="42" y1="8" x2="39" y2="12" stroke="#4A90D9" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="58" y1="8" x2="62" y2="4" stroke="#4A90D9" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="58" y1="8" x2="61" y2="12" stroke="#4A90D9" stroke-width="1.5" stroke-linecap="round"/>
          <!-- leaves -->
          <circle cx="38" cy="3" r="2.5" fill="#5BA3E8"/>
          <circle cx="62" cy="3" r="2.5" fill="#5BA3E8"/>
          <circle cx="50" cy="9" r="2" fill="#5BA3E8"/>
          <circle cx="39" cy="13" r="1.8" fill="#5BA3E8"/>
          <circle cx="61" cy="13" r="1.8" fill="#5BA3E8"/>
          <!-- neck -->
          <line x1="44" y1="64" x2="44" y2="72" stroke="#4A90D9" stroke-width="3" stroke-linecap="round"/>
          <line x1="56" y1="64" x2="56" y2="72" stroke="#4A90D9" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `)}`}
      sx={{ width: size, height: size }}
    />
  );
}

/* ─── Login Form Panel ──────────────────────────────────────────────────────── */
function LoginForm({ onSuccess }) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || 'Pogrešan email ili lozinka.');
    },
  });

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email adresa je obavezna';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Unesite ispravnu email adresu';
    if (!form.password) errs.password = 'Lozinka je obavezna';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    mutation.mutate({ email: form.email, password: form.password });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  const handleChange = (field) => (e) => {
    const value = field === 'remember' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  return (
    <Slide direction={isMobile ? 'up' : 'left'} in mountOnEnter timeout={500}>
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', md: 400 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: { xs: 3, sm: 5, md: 4 },
          py: { xs: 5, md: 6 },
        }}
      >
        {/* Logo */}
        <Fade in timeout={700}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3.5 }}>
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: 'rgba(74, 144, 217, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                background: 'rgba(74, 144, 217, 0.04)',
              }}
            >
              <LogoIcon size={56} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.15rem', md: '1.2rem' },
                color: 'text.primary',
                letterSpacing: '-0.01em',
              }}
            >
              LogoDnevnik LogoTim
            </Typography>
          </Box>
        </Fade>

        {/* Error Alert */}
        <Fade in={!!apiError} unmountOnExit>
          <Alert
            severity="error"
            sx={{ width: '100%', mb: 2, borderRadius: 1, fontSize: '0.82rem' }}
            onClose={() => setApiError('')}
          >
            {apiError}
          </Alert>
        </Fade>

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          sx={{ width: '100%' }}
          noValidate
        >
          {/* Email */}
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.82rem', mb: 0.6, display: 'block' }}
          >
            Email adresa
          </Typography>
          <TextField
            fullWidth
            type="email"
            placeholder="Unesite vašu email adresu"
            value={form.email}
            onChange={handleChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            autoComplete="email"
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined sx={{ fontSize: 20, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontSize: '0.9rem',
                backgroundColor: 'rgba(0,0,0,0.02)',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(0,0,0,0.02)',
                },
                '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
                  WebkitBoxShadow: '0 0 0 100px #f9f9f9 inset',
                  WebkitTextFillColor: 'inherit',
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              },
            }}
          />

          {/* Password */}
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.82rem', mb: 0.6, display: 'block' }}
          >
            Lozinka
          </Typography>
          <TextField
            fullWidth
            type={showPass ? 'text' : 'password'}
            placeholder="Unesite lozinku"
            value={form.password}
            onChange={handleChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            autoComplete="current-password"
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ fontSize: 20, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPass((s) => !s)}
                    edge="end"
                    size="small"
                    sx={{ color: 'text.disabled' }}
                  >
                    {showPass ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontSize: '0.9rem',
                backgroundColor: 'rgba(0,0,0,0.02)',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(0,0,0,0.02)',
                },
                '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
                  WebkitBoxShadow: '0 0 0 100px #f9f9f9 inset',
                  WebkitTextFillColor: 'inherit',
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              },
            }}
          />

          {/* Remember me + Forgot */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.remember}
                  onChange={handleChange('remember')}
                  size="small"
                  sx={{ '& .MuiSvgIcon-root': { fontSize: 18 } }}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  Zapamti me
                </Typography>
              }
            />
            <Link
              href="#"
              underline="hover"
              sx={{
                fontSize: '0.8rem',
                color: 'primary.main',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Zaboravili ste lozinku?
            </Link>
          </Box>

          {/* Submit */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={mutation.isPending}
            sx={{
              py: 1.5,
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '10px',
              letterSpacing: '0.01em',
              background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
              transition: 'all 0.25s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                boxShadow: '0 6px 20px rgba(37,99,235,0.45)',
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0)' },
            }}
          >
            {mutation.isPending ? (
              <CircularProgress size={22} sx={{ color: 'white' }} />
            ) : (
              'Prijavite se'
            )}
          </Button>
        </Box>

        {/* Footer note */}
        <Typography
          variant="caption"
          sx={{ mt: 4, color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}
        >
          © {new Date().getFullYear()} LogoTim · Sva prava zadržana
        </Typography>
      </Box>
    </Slide>
  );
}

/* ─── Hero / Left Panel ─────────────────────────────────────────────────────── */
function HeroPanel() {
  return (
    <Fade in timeout={600}>
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
        <Box
          component="img"
          src={loginImg}
          alt="Logopedski centar"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(15,23,42,0.55) 0%, rgba(29,78,216,0.3) 100%)',
          }}
        />

        {/* Text content */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: { xs: 4, sm: 5, md: 6 },
            pb: { xs: 5, md: 8 },
          }}
        >
          <Slide direction="up" in mountOnEnter timeout={700}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: { md: '2.2rem', lg: '2.6rem' },
                  lineHeight: 1.2,
                  mb: 1.5,
                  textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  letterSpacing: '-0.02em',
                }}
              >
                Dobrodošli u naš centar
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 400,
                  fontSize: { md: '1rem', lg: '1.1rem' },
                  textShadow: '0 1px 6px rgba(0,0,0,0.25)',
                  lineHeight: 1.6,
                }}
              >
                Profesionalna logopedska pomoć za sve uzraste
              </Typography>
            </Box>
          </Slide>
        </Box>
      </Box>
    </Fade>
  );
}

/* ─── Page Root ─────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const lightTheme = useMemo(() => getTheme('light'), []);
  const isMobile = useMediaQuery(lightTheme.breakpoints.down('md'));

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      {isMobile ? (
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Full-page background image on mobile */}
          <Box
            component="img"
            src={loginImg}
            alt=""
            sx={{
              position: 'fixed',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              zIndex: 0,
            }}
          />
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.7) 100%)',
              zIndex: 1,
            }}
          />

          {/* Hero text top */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              pt: 6,
              px: 4,
              pb: 2,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.8rem',
                lineHeight: 1.2,
                mb: 1,
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              Dobrodošli u naš centar
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.95rem',
                textShadow: '0 1px 6px rgba(0,0,0,0.25)',
              }}
            >
              Profesionalna logopedska pomoć za sve uzraste
            </Typography>
          </Box>

          {/* Form card */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              mt: 'auto',
              mx: { xs: 0 },
              background: '#fff',
              borderRadius: '10px 10px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <LoginForm />
          </Box>
        </Box>
      ) : (
        /* Desktop / Tablet */
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          {/* Left: hero image panel — ~65% width */}
          <Box sx={{ flex: '0 0 62%', display: 'flex' }}>
            <HeroPanel />
          </Box>

          {/* Right: form panel — ~38% width */}
          <Box
            sx={{
              flex: '0 0 38%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#fff',
              boxShadow: '-8px 0 48px rgba(0,0,0,0.12)',
              position: 'relative',
              zIndex: 1,
              minHeight: '100vh',
              overflowY: 'auto',
            }}
          >
            <LoginForm />
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
}

