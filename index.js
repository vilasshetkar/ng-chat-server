const express = require('express');
const app = express();
const httpServer = require("http").Server(app);
const io = require("socket.io")(httpServer, {
  cors: {
    // origin: "http://localhost:4200"
    origin: "https://fa-chatapp.herokuapp.com"
  },
});

app.use(express.static('public'));

const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const { SessionStore } = require("./sessionStore");
const sessionStore = new SessionStore();

const { UserStore } = require("./userStore");
const userStore = new UserStore();

const { MessageStore } = require("./messageStore");
const messageStore = new MessageStore();

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  console.log('sess...', sessionID);
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    } else {
      return next(new Error("Session Expired!"));
    }
  }
  const username = socket.handshake.auth.username;
  const password = socket.handshake.auth.password;
  const confirmPassword = socket.handshake.auth.confirmPassword;

  if (!username || !password) {
    return next(new Error("Invalid username or password"));
  }

  const user = userStore.findUser(username);
  console.log(user);
  if (user) {

    if (user.password != password) {
      return next(new Error("Password doesn't match!"));
    }

    socket.sessionID = randomId();
    socket.userID = user.userID;
    socket.username = user.username;
    return next();
  } else if (username && password && confirmPassword) {
    if (password !== confirmPassword) {
      return next(new Error("Password doesn't match!"));
    }

    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = username;
    socket.password = password;

    userStore.saveUser(socket.username, {
      userID: socket.userID,
      username: socket.username,
      password: socket.password
    });

  } else {
    return next(new Error("You are not registered user!"));
  }
  next();
});

io.on("connection", (socket) => {
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    sessionID: socket.sessionID,
    username: socket.username,
    connected: true,
  });

  // emit session details
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  // join the "userID" room
  socket.join(socket.userID);

  // fetch existing users
  const users = [];
  const messagesPerUser = new Map();
  messageStore.findMessagesForUser(socket.userID).forEach((message) => {
    const { from, to } = message;
    const otherUser = socket.userID === from ? to : from;
    if (messagesPerUser.has(otherUser)) {
      messagesPerUser.get(otherUser).push(message);
    } else {
      messagesPerUser.set(otherUser, [message]);
    }
  });
  sessionStore.findAllSessions().forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
      messages: messagesPerUser.get(session.userID) || [],
    });
  });
  socket.emit("users", users);

  // notify existing users
  socket.broadcast.emit("user connected", {
    userID: socket.userID,
    username: socket.username,
    connected: true,
    messages: [],
  });

  // forward the private message to the right recipient (and to other tabs of the sender)
  socket.on("private message", ({ content, to }) => {
    const message = {
      content,
      from: socket.userID,
      to,
      date: (new Date()).toISOString()
    };
    socket.to(to).to(socket.userID).emit("private message", message);
    messageStore.saveMessage(message);
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit("user disconnected", socket.userID);
      // update the connection status of the session
      sessionStore.saveSession(socket.sessionID, {
        sessionID: socket.sessionID,
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () =>
  console.log(`server listening at http://localhost:${PORT}`)
);
