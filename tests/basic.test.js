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
// Agent Constructor: Import data.methods
// Agent Runner: Save agent data.vars
// Agent Constructor: Import data.vars
// Human-Agent: Request Reader: Translates request json to human readable format
// Human-Agent: Request Reader: Print out how many human requests vs machine requests
// Agent: Spawn new agent
// Agent: Act: Read messages from the board
// Agent: Post request

// Pass 9:

// Pass 8:
// Create Message Board: Requests and Responses
// Create

const {createAgent, Agent, AgentRunner, MessageBoard} = require('../run.js');
const AGENT_PATH = './agents/active';

beforeAll(() => {
});

beforeEach(() => {
});

afterEach(() => {
});

test('agent can be saved', () => {
    const agent = createAgent('3_dummy.js', AGENT_PATH);
    agent.save(AGENT_PATH);
    const agent2 = createAgent('3_dummy.js', AGENT_PATH);
    console.log(agent2);
});

test('agents can be created with names', () => {
    const agent = createAgent('3_dummy.js', AGENT_PATH);
    expect(agent.name).toBe('3_dummy.js');
});

test('agent runner loops through agent files', () => {
    const runner = new AgentRunner();
    runner.runRound();
});

test('able to create new agent from file', () => {
    const agent = createAgent(`3_dummy.js`, AGENT_PATH);
    expect(Object.keys(agent).length).toBe(4);
});
