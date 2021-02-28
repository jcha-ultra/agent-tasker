// Guiding Principles:
// - Little top-down control—agents are semi-independent entities, each making its own decisions
// - Humans are just another type of agents
// - Agents should be as similar to each other as possible in terms of possible actions

// BACKLOG:
// Implement TypeScript
// Orphaned Agents: Neither requests or responses outstanding for it
// Timer Agent
// Implement Priority System (priority = importance * urgency * delay)
// Create new agent that doesn't have a data path
// > ---MVP---
// Human-Agent: Post processing request
// Agent Runner: Save agent data.vars
// Agent Constructor: Import data.vars
// Human-Agent: Request Reader: Translates request json to human readable format
// Human-Agent: Request Reader: Print out how many human requests vs machine requests
// Agent: act()

// Pass 17:
// Agent: Respond to request to perform task


// Pass 16:
// Agent: Tasklist


const {createAgentFromFile, Agent, AgentRunner, MessageBoard, genNewId} = require('../run.js');
const AGENT_PATH = './agents';
const MESSAGE_PATH = './messages';
const board = new MessageBoard();

beforeAll(() => {
});

beforeEach(() => {
});

afterEach(() => {
});






// test('agent can ask another to perform task', () => {
//     const agent = createAgentFromFile('3_dummy.js');
//     const newAgent = createAgentFromFile('4_dummy.js');
//     agent.requestTask(board, newAgent.id, 'do something')
// });

// test('agent spawns another agent successfully', () => {
//     const agent = createAgentFromFile('3_dummy.js');
//     newAgent = agent.spawnSubAgent();
//     console.log(newAgent);
// });

test('agent can read requests for itself', () => {
    const agent = createAgentFromFile('3_dummy.js');
    const requests = agent.readRequests(board);
    console.log(requests);
});

// test('new id can be generated based on number of files in folder', () => {
//     const newAgentId = genNewId(AGENT_PATH);
//     const newMessageId = genNewId(MESSAGE_PATH);
//     expect(newAgentId).toBe(5);
//     expect(newMessageId).toBe(2);
// });

test('agent can create message', () => {
    const agent = createAgentFromFile('3_dummy.js', `${AGENT_PATH}/active`);
    const board = new MessageBoard();
    agent.postRequest(board, {blah: 'blah!'});
});

test('agent can be saved', () => {
    const agent = createAgentFromFile('3_dummy.js', `${AGENT_PATH}/active`);
    agent.save(`${AGENT_PATH}/active`);
    const agent2 = createAgentFromFile('3_dummy.js', `${AGENT_PATH}/active`);
    // console.log(agent2);
});

test('agents can be created with names', () => {
    const agent = createAgentFromFile('3_dummy.js', `${AGENT_PATH}/active`);
    expect(agent.id).toBe('3_dummy');
});

test('agent runner loops through agent files', () => {
    const runner = new AgentRunner();
    runner.runRound();
});

// test('able to create new agent from file', () => {
//     const agent = createAgentFromFile(`3_dummy.js`, `${AGENT_PATH}/active`);
//     expect(Object.keys(agent).length).toBe(5);
// });
