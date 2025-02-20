const { Server } = require('socket.io');

let io;

exports.initSocket = (server) => {
  io = new Server(server);
  
  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('timer-control', (action) => {
      io.emit('timer-update', action);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};

exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}; 