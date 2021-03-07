const {createAgentFromFile, Agent, AgentRunner, MessageBoard, genNewId} = require('../run.js');
const AGENT_PATH = './agents';
const AGENT_PATH_ACTIVE = './agents/active';
const MESSAGE_PATH = './messages';
const board = new MessageBoard();

beforeAll(() => {
});

beforeEach(() => {
});

afterEach(() => {
});


/*************

Guiding Principles:
- Little top-down control—agents are semi-independent entities, each making its own decisions
- Humans are just another type of agents
- Agents should be as similar to each other as possible in terms of possible actions

Agents:
- Agents can only send tasks to either its own subagents, or to agents that are explicitly able to receive requests from any agent
- Agents _can_ post priority updates to non-subagents
- When splitting tasks, each task must be split into items that are independent of each other


Messages:
- Priority Updates: Increases or decreases priority on tasks

**************/

// BACKLOG:
// Implement TypeScript
// Orphaned Agents: Neither requests or responses outstanding for it
// Timer Agent
// Create new agent that doesn't have a data path
// Implement Priority System (priority = importance * urgency * delay)
// Agents: Order tasks by ease
// > ---MVP---
// Make sure request statuses are updated correctly
// Human-Agent: Post processing request
// Request Reader: Display task chain (trace back to parent tasks)
// Request Reader: Translates request json to human readable format
// Request Reader: Print out how many human requests vs machine requests
// Agent: act(): Check requests for self
// Agent: Flow: Subagent reports that a subtask is done (reminder: set subagents to free)
// Agent: Respond to request to perform task
// Agent: sendSubRequests():  Create subrequests for tasks for either existing agent, or new spawned subagent

// Pass 24:

// Pass 23:
// Agent: Split task after getting response for task splitting
// Agent: Message processing architecture: processing responses also

// ....
// ....
// Testing
// ....

test('message processing architecture: processing split_task responses', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('6.js');
    agent.processMessages(board);
    agent.save(AGENT_PATH_ACTIVE);
    expect(agent.tasks['do something 3'].subrequestsIds[0]).toBe('subtask_1');
});

test('message processing architecture: processing requests only', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('6.js');
    agent.processMessages(board);
    agent.save(AGENT_PATH_ACTIVE);
    expect(agent.tasks['do something 3'].requestId).toBe('message_6');
    // console.warn(`Manual Check Needed: ${AGENT_PATH_ACTIVE}/6.js should have "do something 3" as a task`)
});

// test('integration: agent creates request, agent 2 takes request, replies with response', () => {
//     const board = new MessageBoard();
//     const agent = createAgentFromFile('4_dummy.js');
//     const agent2 = createAgentFromFile('3_dummy.js');
//     // agent.requestTask(board, '3_dummy', 'do something 4');
//     agent2.takeNewTasks(board);
//     responseData = {
//         response: 'split_task'
//     }
//     agent2.respond(board, 'do something 4', responseData);
// });

// test('responses must include original message id', () => {
//     const agent = createAgentFromFile('6.js');
//     const board = new MessageBoard();
//     const requestId = 6;
//     const responseData = {
//         response: 'split_task'
//     }
//     agent.respond(board, requestId, responseData);
// });
//
// test('senderId exists', () => {
//     const board = new MessageBoard();
//     const agent = createAgentFromFile('4_dummy.js');
//     const msgId = agent.requestTask(board, '3_dummy', "do something 3");
// });
//
test('board can retrieve specific message', () => {
    const board = new MessageBoard();
    const id = 4;
    const taskName = board.getMessage(id).taskName;
    expect(taskName).toBe('do something 2');
});

// test('agents can send responses', () => {
//     const agent = createAgentFromFile('4_dummy.js');
//     const board = new MessageBoard();
//     const requestId = 4;
//     const responseData = {
//         response: 'task_complete'
//     }
//     agent.respond(board, requestId, responseData);
// });

test('agents can assign unassigned tasks', () => {
    const agent = createAgentFromFile('4_dummy.js');
    agent.takeNewTasks(board);
    // console.log(agent);
    expect(agent.tasks['do something 2'].requestId).toBe(4);
});

test('messages have ids', () => {
    const agent = createAgentFromFile('4_dummy.js');
    agent.takeNewTasks(board);
    // console.log(agent);
    expect(agent.tasks['do something 2'].requestId).toBe(4);
});

test('agent can take task', () => {
    const agent = createAgentFromFile('4_dummy.js');
    agent.tasks['do something'] = [];
    expect(agent.tasks['do something'].toString()).toBe('');
    expect(agent.tasks['do something 2']).toBeUndefined();
    expect(Object.keys(agent.tasks).length).toBe(1);
    agent.takeNewTasks(board);
    expect(agent.tasks['do something'].toString()).toBe('');
    expect(agent.tasks['do something 2'].status).toBe('new');
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
