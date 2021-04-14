const messagePath = `./boards/${process.argv[2]}/messages`;
const { MessageBoard } = require('../run.js');
MessageBoard.stashInactiveMsgs(messagePath);
