import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import logger from './lib/logger';

let io: Server | null = null;

export const initSocket = (server: HttpServer): void => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.debug('Client connected', { socketId: socket.id });
    socket.on('disconnect', () => logger.debug('Client disconnected', { socketId: socket.id }));
  });
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitEvent = (event: string, data: unknown): void => {
  if (io) io.emit(event, data);
};
