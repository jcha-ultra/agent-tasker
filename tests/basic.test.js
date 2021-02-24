// Guiding Principles:
// - Little top-down control—agents are semi-independent entities, each making its own decisions
// - Humans are just another type of agents
// - Agents should be as similar to each other as possible in terms of possible actions

// BACKLOG:
// Implement TypeScript
// Orphaned Agents: Neither requests or responses outstanding for it
// Timer Agent
// Implement Priority System (priority = importance * urgency * delay)
// > ---MVP---
// Human-Agent: Post processing request
// Agent Constructor: Import data.methods
// Agent Runner: Save agent data.vars
// Agent Constructor: Import data.vars
// Human-Agent: Request Reader: Translates request json to human readable format
// Human-Agent: Request Reader: Print out how many human requests vs machine requests
// Agent: Spawn new agent
// Agent: Act: Save self to file
// Agent: Act: Read messages from the board
// Agent: Post request
// Create Message Board: Requests and Responses
// Agent: Ids

// Pass 7:

// Pass 6:
// Agents: Move to active folder

const {createAgent, Agent, AgentRunner} = require('../run.js');

beforeAll(() => {
});

beforeEach(() => {
});

afterEach(() => {
});


test('agent runner loops through agent files', () => {
    const runner = new AgentRunner();
    runner.runRound();
});

test('able to create new agent from file', () => {
    const agent = createAgent('./agents/active/3_dummy.js');
    expect(Object.keys(agent).length).toBe(6);
});
