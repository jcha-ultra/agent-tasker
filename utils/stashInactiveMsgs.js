


const messagePath = `./boards/${process.argv[2]}/messages`;
const { MessageBoard } = require('../run.js');
// console.log(messagePath)
MessageBoard.stashInactiveMsgs(messagePath);
