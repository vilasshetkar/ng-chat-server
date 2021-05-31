
const fs = require('fs');

class MessageStore {
  constructor() {
    
    this.messages = [];

    if (fs.existsSync('messages.json')) {
      let messages = fs.readFileSync('messages.json').toString();

      if (messages) {
        messages = JSON.parse(messages);
      }
      this.messages = messages;
    }

  }

  saveMessage(message) {
    this.messages.push(message);
    fs.writeFileSync('messages.json', JSON.stringify(this.messages));
  }

  findMessagesForUser(userID) {
    return this.messages.filter(
      ({ from, to }) => from === userID || to === userID
    );
  }
}

module.exports = {
  MessageStore,
};
