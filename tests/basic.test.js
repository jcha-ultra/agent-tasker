const {createAgentFromFile, Agent, AgentRunner, MessageBoard, genNewId} = require('../run.js');
const AGENT_PATH = './agents';
const AGENT_PATH_ACTIVE = './agents/active';
const MESSAGE_PATH = './messages';
const board = new MessageBoard();

function createTestAgent() {
    const agent = new Agent();
    agent.id = genNewId(AGENT_PATH);
    agent.save();
    return agent.id;
}

function createTestRequest(taskText) {
    const originAgentId = createTestAgent();
    const originAgent = createAgentFromFile(`${originAgentId}.js`);
    const recipientAgentId = createTestAgent();
    originAgent.requestTask(board, recipientAgentId, taskText);
}

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

Task Workflows:


[request placed on board:]
[agent reads request and adds it to tasklist]
[agent posts request for executor agent]
[executor agent responds: done, dependencies, or split]
[agent performs follow-up based on response:]
    [split: send subrequests to subagents to perform the subtasks of the tasks]
    [dependencies: send dependency messages to appropriate agents who are handling the dependencies]
    [done: close out task; respond to messages that are related to this task (dependents and source request)]
[agent evaluates status of task:]
    [dependencies left: do nothing]
    [no dependencies remaining: send message to executor agent]


....

....





....


**************/

// BACKLOG:
// Implement TypeScript
// Orphaned Agents: Neither requests or responses outstanding for it
// Timer Agent
// Create new agent that doesn't have a data path
// Implement Priority System (priority = importance * urgency * delay)
// Agents: Order tasks by ease
// ---MVP---
// Make sure request statuses are updated correctly
// Human-Agent: Post processing request
// Request Reader: Display task chain (trace back to parent tasks)
// Request Reader: Translates request json to human readable format
// Request Reader: Print out how many human requests vs machine requests
// Agent: act(): Check requests for self
// Agent: Move messages to archive after being done with them
// Agent: Flow: Subagent reports that a subtask is done (reminder: set subagents to free)
// Agent: Respond to request to perform task

// [agent processes messages:]
//     ✅[requests: ADD to tasklist]
//     [dependency notes: ADD to task's dependents list]
//     [responses:]
//         [for dependency note:]
//             [done:]
//                 [ARCHIVE dependency NOTE]
//                 [REMOVE from dependencies list]
//         [for dependency request:]
//             [done:]
//                 [ARCHIVE dependency REQUEST]
//                 [REMOVE from dependencies list]
//                 [de-allocate subagents]
//         [for execution request:]
//             [done:]
//                 🚧[SEND done RESPONSE to source request]
//                 [SEND done RESPONSE to dependency notes on dependents list]
//                 [ARCHIVE execution REQUEST]
//                 [REMOVE from tasklist]
//             ✅[split:]
//                 ✅[ADD to dependencies list]
//                 ✅[SEND dependency REQUEST to subagents]
//                 ✅[allocate subagents]
//                 ✅[ARCHIVE execution REQUEST]
//                 ✅[REMOVE from execution ids list]
//             [dependencies:]
//                 [ADD to dependencies list]
//                 [SEND dependencies NOTE to agents]
//                 [ARCHIVE execution REQUEST]
// ✅[agent evaluates tasks in tasklist:]
//     ✅[dependencies list empty and execution ids list empty:]
//            ✅[SEND execution REQUEST]
//            ✅[ADD to execution ids list]


// Pass 29:

// Pass 28:
// Task flow

// ....


// ....

describe('task can go through full flow', () => {
    const board = new MessageBoard();
    const taskAgent = createAgentFromFile('10_13.js');
    const doAgent = createAgentFromFile('11_14.js');
    const humanAgent = createAgentFromFile('0_human.js');
    afterEach(() => {
        doAgent.save();
    });
    test('agent reads task', () => {
        doAgent.processMessages(board);
        expect(Object.keys(doAgent.tasks).length).toBe(1);
    });
    test('agent sends execution request', () => {
        doAgent.evaluateTasks(board);
        expect(doAgent.tasks['do something 4'].executionIds.length).toBe(1);
        // console.warn(`MANUAL TEST: verify that execution request for agent ${doAgent.id}'s tasks has been posted`);
    });
    test('human agent posts split task response', () => {
        const requestId = doAgent.tasks['do something 4'].executionIds[0];
        humanAgent.postResponse(board, requestId, {
            response: 'split_task',
            data: {
                subtasks: [
                    'subtask_1',
                    'subtask_2'
                ]
            }
        });
    });
    test.only('agent processes split_task responses', () => {
        doAgent.processMessages(board);
        expect(doAgent.tasks['do something 4'].dependencyIds.length).toBe(2);
        console.warn(`MANUAL TEST: verify that agent ${doAgent.id} has successfully allocated subtasks to subagents`);
        expect(doAgent.tasks['do something 4'].executionIds.length).toBe(0);
        console.warn(`MANUAL TEST: verify that execution request has been archived`);
    });

    test.skip('', () => {
    });
});


// [do: create full flow test]
// ....




test.skip('agents do not keep performing actions from already-handled requests and responses', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('6.js');
    agent.processMessages(board);
    agent.save(AGENT_PATH_ACTIVE);
    expect(agent.subagents.free.length + agent.subagents.busy.length).toBe(2);
    expect(Object.keys(agent.tasks).length).toBe(1);
    expect(agent.tasks['do something 3'].subrequestsIds.length).toBe(2);
    console.warn('Manual Test: Response message_9 should now be archived!');
});

test.skip('message processing architecture: processing split_task responses', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('6.js');
    agent.processMessages(board);
    agent.save(AGENT_PATH_ACTIVE);
    expect(agent.tasks['do something 3'].subrequestsIds[0]).toBe('message_10_3');
});

test.skip('message processing architecture: processing requests only', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('6.js');
    agent.processMessages(board);
    agent.save(AGENT_PATH_ACTIVE);
    expect(agent.tasks['do something 3'].requestId).toBe('message_6');
    // console.warn(`Manual Check Needed: ${AGENT_PATH_ACTIVE}/6.js should have "do something 3" as a task`)
});

test.skip('integration: agent creates request, agent 2 takes request, replies with response', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('4_dummy.js');
    const agent2 = createAgentFromFile('3_dummy.js');
    // agent.requestTask(board, '3_dummy', 'do something 4');
    agent2.takeNewTasks(board);
    responseData = {
        response: 'split_task'
    }
    agent2.respond(board, 'do something 4', responseData);
});

test.skip('responses must include original message id', () => {
    const agent = createAgentFromFile('6.js');
    const board = new MessageBoard();
    const requestId = 6;
    const responseData = {
        response: 'split_task'
    }
    agent.respond(board, requestId, responseData);
});

test.skip('senderId exists', () => {
    const board = new MessageBoard();
    const agent = createAgentFromFile('4_dummy.js');
    const msgId = agent.requestTask(board, '3_dummy', "do something 3");
});

test('board can retrieve specific message', () => {
    const board = new MessageBoard();
    const id = 4;
    const taskName = board.getMessage(id).taskName;
    expect(taskName).toBe('do something 2');
});

test.skip('agents can send responses', () => {
    const agent = createAgentFromFile('4_dummy.js');
    const board = new MessageBoard();
    const requestId = 4;
    const responseData = {
        response: 'task_complete'
    }
    agent.respond(board, requestId, responseData);
});

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

test.skip('agent can take task', () => {
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

test.skip('agent can ask another to perform task', () => {
    const agent = createAgentFromFile('3_dummy.js');
    const newAgent = createAgentFromFile('4_dummy.js');
    agent.requestTask(board, newAgent.id, 'do something')
});

test.skip('agent spawns another agent successfully', () => {
    const agent = createAgentFromFile('3_dummy.js');
    newAgent = agent.spawnSubAgent();
    console.log(newAgent);
});

test('agent can read requests for itself', () => {
    const agent = createAgentFromFile('3_dummy.js');
    const requests = agent.readRequests(board);
    // console.log(requests);
});

test.skip('new id can be generated based on number of files in folder', () => {
    const newAgentId = genNewId(AGENT_PATH);
    const newMessageId = genNewId(MESSAGE_PATH);
    expect(newAgentId).toBe(5);
    expect(newMessageId).toBe(2);
});

test.skip('agent can create message', () => {
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

test.skip('able to create new agent from file', () => {
    const agent = createAgentFromFile(`3_dummy.js`, `${AGENT_PATH}/active`);
    expect(Object.keys(agent).length).toBe(5);
});
