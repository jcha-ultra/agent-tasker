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
// Agent: Act: Save self to file
// Agent: Act: Read messages from the board
// Agent: Post request
// Create Message Board: Requests and Responses

// Pass 5:
// Agent Runner: Loop through agent files in reverse order

// Pass 4:
// Agent: Spawn dummy agent from file



const Agent = require('../run.js');

beforeAll(() => {
});

beforeEach(() => {
});

afterEach(() => {
});


test('print out spawned agent', () => {
    const agent = new Agent('./agents/3_dummy.js')
    console.log(agent);
});
