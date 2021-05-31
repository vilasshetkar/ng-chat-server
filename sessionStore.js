
const fs = require('fs');

class SessionStore {
  constructor() {
    
    
    if (fs.existsSync('sessions.json')) {
      let sessions = fs.readFileSync('sessions.json').toString();

      if (sessions) {
        sessions = JSON.parse(sessions);
      }
      this.sessions = new Map(sessions.map(i => [i.sessionID, i]));
    } else {
      this.sessions = new Map();
    }

  }

  findSession(id) {
    return this.sessions.get(id);
  }

  saveSession(id, session) {
    this.sessions.delete(id);
    this.sessions.set(id, session);
    fs.writeFileSync('sessions.json', JSON.stringify(Array.from(this.sessions.values())));
  }

  removeSession(id) {
    this.sessions.delete(id);
    fs.writeFileSync('sessions.json', JSON.stringify(Array.from(this.sessions.values())));
  }

  findAllSessions() {
    return [...this.sessions.values()];
  }
}

module.exports = {
  SessionStore
};
