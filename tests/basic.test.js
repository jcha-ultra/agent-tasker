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
// Agent: Respond to request to perform task

// Pass 17:

// Pass 16:



// ....


// ....

// [story: assignTasks: assigns any unassigned tasks to either existing agent, or new spawned subagent]
// [story: if there are no free subagents, then spawn a new subagent]
// [story: if there is a free subagent, then ask that new agent]
// [move: agent notes: subagents' tasks can only be controlled by superagent]
// [move: agent notes: subagents' priorities can be changed by other agents besides superagent]
// [move: request notes: priority update requests: increases/decreases priority on tasks]
// [move: request notes: evaluation request: checks if task is complete]
// [move: story: agents order their tasks by priority and ease]

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

test('agent can take task', () => {
    const agent = createAgentFromFile('4_dummy.js');
    agent.tasks['do something'] = [];
    expect(agent.tasks['do something'].toString()).toBe('');
    expect(agent.tasks['do something 2']).toBeUndefined();
    expect(Object.keys(agent.tasks).length).toBe(1);
    agent.takeNewTasks(board);
    expect(agent.tasks['do something'].toString()).toBe('');
    expect(agent.tasks['do something 2'].toString()).toBe('');
    expect(Object.keys(agent.tasks).length).toBe(2);
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
    // console.log(requests);
});

// test('new id can be generated based on number of files in folder', () => {
//     const newAgentId = genNewId(AGENT_PATH);
//     const newMessageId = genNewId(MESSAGE_PATH);
//     expect(newAgentId).toBe(5);
//     expect(newMessageId).toBe(2);
// });

// test('agent can create message', () => {
//     const agent = createAgentFromFile('3_dummy.js', `${AGENT_PATH}/active`);
//     const board = new MessageBoard();
//     agent.postRequest(board, {blah: 'blah!'});
// });
//
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
