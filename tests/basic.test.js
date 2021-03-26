const {createAgentFromFile, Agent, AgentRunner, MessageBoard, genNewId} = require('../run.js');
const Raika = require('../raika.js');
const AGENT_PATH = './boards/test2/agents';
const AGENT_PATH_ACTIVE = './boards/test2/agents/active';
const MESSAGE_PATH = './boards/test2/messages';
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

    // ✅[agent processes messages:]
    //     ✅[requests: ADD to tasklist]
    //     ✅[dependency notes: ADD to task's dependents list]
    //     ✅[responses:]
    //         ✅[for dependencies:]
    //             ✅[done:]
    //                 ✅[ARCHIVE dependency NOTE/REQUEST]
    //                 ✅[ARCHIVE done RESPONSE]
    //                 ✅[REMOVE from dependencies list]
    //                 ✅[deallocate subagents]
    //         ✅[for execution request:]
    //             ✅[done:]
    //                 ✅[SEND done RESPONSE to source request]
    //                 ✅[SEND done RESPONSE to dependency notes on dependents list]
    //                 ✅[ARCHIVE execution REQUEST]
    //                 ✅[REMOVE from tasklist]
    //             ✅[split:]
    //                 ✅[ADD to dependencies list]
    //                 ✅[SEND dependency REQUEST to subagents]
    //                 ✅[allocate subagents]
    //                 ✅[ARCHIVE execution REQUEST]
    //                 ✅[REMOVE from execution ids list]
    //             ✅[dependencies:]
    //                 ✅[SEND dependencies NOTE to agents]
    //                 ✅[ADD to dependencies list]
    //                 ✅[ARCHIVE execution REQUEST]
    // ✅[agent evaluates tasks in tasklist:]
    //     ✅[dependencies list empty and execution ids list empty:]
    //         ✅[SEND execution REQUEST]
    //         ✅[ADD to execution ids list]


**************/

// BACKLOG:
// Implement TypeScript
// Timer Task
// Model Other Humans Agents
// Create new agent that doesn't have a data path
// Implement Priority System (value, effort, urgency)
// Request Reader: Display task chain (trace back to parent tasks)
// User can send processing_needed messages
// ---MVP---

// Pass 30:

// Pass 29:

describe('user can perform task end-to-end', () => {
    // task: buy new earphones
    const board = new MessageBoard();
    const raika = new Raika(board);

    beforeAll(() => {
    });

    afterAll(() => {
    });

    test('raika asks user what they would like to do upon startup', () => {
        console.warn(`MANUAL TEST: verify that raika asks user what they would like to do`);
        raika.start();
    });

    test('raika prompts user to reply', async () => {
        console.warn(`MANUAL TEST: verify that user can enter input`);
        await raika.start();
    });

    test('raika exits when prompted', async () => {
        console.warn(`MANUAL TEST: verify that raika exits after selecting exit option`);
        await raika.start();
    });

    test('raika loops', async () => {
        console.warn(`MANUAL TEST: verify that raika loops`);
        await raika.start();
    });


    describe('raika can add a task', () => {
        test('raika can ask user for a task to add', async () => {
            console.warn(`MANUAL TEST: verify that raika can prompt user to add a task`);
            await raika.start();
        });
        test('raika sends task adding message', async () => {
            console.warn(`MANUAL TEST: verify that raika sends a message to the source agent to add a task`);
            await raika.start();
        });
    });

    test('raika can wait for a round to be run', async () => {
        console.warn(`MANUAL TEST: verify that you can select the option to run a round, and that it works`);
        await raika.start();
    });

    test('raika can pull out list of tasks for a human agent', async () => {
        console.warn(`MANUAL TEST: verify that you can select option to get tasks for a user, and it works`);
        await raika.start();
    });

    // ....
    describe('human agent can send messages back', () => {
        test.only('raika can display tasklist as options for user to select', async () => {
            console.warn(`MANUAL TEST: verify that when you select to display tasklist, tasklist displays as options you can select`);
            await raika.start();
        });


        // test.only('selecting a task option allows additional options for split_task, dependencies_needed, and done', async () => {});
        // test.only('user can select done', async () => {});
        // test.only('user can select split_task', async () => {});
        // test.only('user can select dependencies_needed', async () => {});
    });


    // [do: next step in flow]
    // ....

    // test.only('', async () => {});
    // test.only('', async () => {});
});


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
    test('agent processes split_task responses', () => {
        doAgent.processMessages(board);
        expect(doAgent.tasks['do something 4'].dependencyIds.length).toBe(2);
        console.warn(`MANUAL TEST: verify that agent ${doAgent.id} has successfully allocated subtasks to subagents`);
        expect(doAgent.tasks['do something 4'].executionIds.length).toBe(0);
        console.warn(`MANUAL TEST: verify that execution request has been archived`);
    });

    describe('agent behaves correctly after receiving done response for execution request', () => {
        const doAgent1_1 = createAgentFromFile('agent_12_1.js');
        const doAgent1_2 = createAgentFromFile('agent_13_2.js');

        beforeEach(() => {
            doAgent1_1.act(board);
            doAgent1_2.act(board);
        });
        test('human sends done to execution requests', () => {
            const requestId = doAgent1_1.tasks['subtask_1'].executionIds[0];
            const requestId2 = doAgent1_2.tasks['subtask_2'].executionIds[0];
            humanAgent.respond(board, requestId, 'done');
            humanAgent.respond(board, requestId2, 'done');
        });
        test('after receiving done response for execution request, agent sends done to source request', () => {
            console.warn(`MANUAL TEST: verify that a 'done' message was sent to '11_14' in response to 'message_15_3' and 'message_16_4'`);
        });
        test('execution request is archived after done response', () => {
            console.warn(`MANUAL TEST: verify that the 'done' responses (19_1 and 19_2) to the subtasks are archived`);
            console.warn(`MANUAL TEST: verify that original execution requests (17_1, 18_2) are archived`)
        });
        test('task is removed from tasklist after receiving done response', () => {
            expect(doAgent1_1.taskNames.length).toBe(0);
            expect(doAgent1_2.taskNames.length).toBe(0);
        });
        test('agent archives dependency requests based on done response', () => {
            doAgent.act(board);
            expect(doAgent.tasks['do something 4'].dependencyIds.length).toBe(0);
            console.warn('MANUAL TEST: verify that dependency request for 11_14 are archived');
            console.warn('MANUAL TEST: verify that dependency response for 11_14 are archived');
            console.warn('MANUAL TEST: verify that 11_14 sends out a new execution message');
        });
    });

    describe('agent goes through dependency workflow', () => {
        dependencyTaskAskAgent = createAgentFromFile('agent_14.js');
        dependencyTaskDoAgent = createAgentFromFile('agent_15.js');

        beforeEach(() => {
        });

        test('create request that will serve as a dependency for another task', () => {
            dependencyTaskAskAgent.requestTask(board, 'agent_15', 'dependency_test_task', { subtype: 'execution'});
            console.warn('MANUAL TEST: verify that request has been created');
        });
        test('dependency agent reads task', () => {
            dependencyTaskDoAgent.act(board);
            console.warn('MANUAL TEST: verify that dependency agent read in task and sends out execution request');
        });
        test('human agent responds with dependency response', () => {
            const requestId = doAgent.tasks['do something 4'].executionIds[0];
            humanAgent.respond(board, requestId, 'dependencies_needed', { dependencies: { agent_15: ['dependency_test_task'] }});
            console.warn('MANUAL TEST: verify that the response is posted');
        });

        test('agent processes dependency response', () => {
            doAgent.act(board);
            console.warn('MANUAL TEST: verify that dependency note has been sent to dependencyTaskDoAgent');
            console.warn('MANUAL TEST: verify that dependencies list for doAgent has been updated');
            console.warn('MANUAL TEST: verify that original execution request (23_1) has been archived');
        });

        test('dependency agent can process dependency note', () => {
            dependencyTaskDoAgent.act(board);
            console.warn('MANUAL TEST: verify that dependent has been added');
        });

        test('human agent tells dependency agent task is complete', () => {
            const requestId = dependencyTaskDoAgent.tasks['dependency_test_task'].executionIds[0];
            humanAgent.respond(board, requestId, 'done');
            console.warn('MANUAL TEST: verify that human agent message has been sent');
        });

        test('dependency agent sends done response to dependents for task after task is done', () => {
            dependencyTaskDoAgent.act(board);
            console.warn('MANUAL TEST: verify that dependency agent has sent done response');
        });
    });
});

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
