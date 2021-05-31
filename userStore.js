
const fs = require('fs');

class UserStore {
  constructor() {
    

    if (fs.existsSync('users.json')) {
      let users = fs.readFileSync('users.json').toString();

      if (users) {
        users = JSON.parse(users);
      }
      this.users = new Map(users.map(i => [i.username, i]));
    } else {
      this.users = new Map();
    }

  }

  findUser(id) {
    return this.users.get(id);
  }

  saveUser(id, session) {
    this.users.set(id, session);
    fs.writeFileSync('users.json', JSON.stringify(Array.from(this.users.values())));
  }

  findAllUsers() {
    return [...this.users.values()];
  }
}

module.exports = {
  UserStore
};
