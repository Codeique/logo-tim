import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';

let socket = null;

const getSocket = () => {
  if (!socket) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '/';
    socket = io(backendUrl, { path: '/socket.io', transports: ['websocket'] });
  }
  return socket;
};

export const useSocket = () => {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;
    const s = getSocket();

    const invalidate = (keys) => keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));

    s.on('patients:updated', () => invalidate(['patients', 'patient']));
    s.on('therapists:updated', () => invalidate(['therapists', 'therapist']));
    s.on('rooms:updated', () => invalidate(['rooms']));
    s.on('sessions:updated', () => invalidate(['sessions', 'calendar']));
    s.on('transactions:updated', () => invalidate(['transactions', 'patients', 'patient']));
    s.on('evaluations:updated', () => invalidate(['evaluations']));
    s.on('militaryRequests:updated', () => invalidate(['militaryRequests']));
    s.on('finance:updated', () => invalidate(['finance']));

    return () => {
      s.off('patients:updated');
      s.off('therapists:updated');
      s.off('rooms:updated');
      s.off('sessions:updated');
      s.off('transactions:updated');
      s.off('evaluations:updated');
      s.off('militaryRequests:updated');
      s.off('finance:updated');
    };
  }, [accessToken, queryClient]);
};
