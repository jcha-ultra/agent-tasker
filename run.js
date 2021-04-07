const fs = require('fs');
const ENV = process.argv[2] || 'prod';
const AGENT_PATH = `./boards/${ENV}/agents`;
const MESSAGE_PATH = `./boards/${ENV}/messages`;

const requestIgnoreList = [];

function requireNoCache(filePath) {
    let _invalidateRequireCacheForFile = function(filePath) {
    	delete require.cache[require.resolve(filePath)];
    };
    _invalidateRequireCacheForFile(filePath);
	return require(filePath);
}

function saveData(contents, dataPath) {
    const selfExport = 'module.exports = ' + JSON.stringify(contents, null, 4);
    fs.writeFile(dataPath, selfExport, err => {
        if (err) {
            throw err;
        }
    })
}

function removeFromArray(array, elementToRemove) {
    return array.filter(element => element !== elementToRemove);
}

let id_suffix = 0;
function genNewId(path) {
    const activeNum = fs.readdirSync(`${path}/active`).length;
    const inactiveNum = fs.readdirSync(`${path}/inactive`).length;
    id_suffix = id_suffix + 1;
    return (activeNum + inactiveNum) + '_' + id_suffix;
}

class Agent {
    constructor(id) {
        this.id = id;
        this.tasks = {};
        this.subagents = {
            free: [],
            busy: []
        };
    }

    get freeSubAgents() {
        return this.subagents.free;
    }

    get taskNames() {
        return Object.keys(this.tasks);
    }

    act(board) {
        this.save();
        this.processMessages(board);
        this.evaluateTasks(board);
        this.save();
    }

    addToDependencyList(taskName, id) {
        this.tasks[taskName].dependencyIds.push(id);
    }

    addToRequestIgnoreList(id) {
        requestIgnoreList.push(id);
    }

    allocateSubagents(numAgentsNeeded) {
        const numNewSubagentsNeeded = Math.max(0, numAgentsNeeded - this.freeSubAgents.length);
        if (numNewSubagentsNeeded > 0) {
            this.spawnSubAgents(numNewSubagentsNeeded);
        }
        return this.freeSubAgents;
    }

    assignSubtask(taskname, subtask, subagentId, board) {
        const recipientId = subagentId;
        const requestId = this.requestTask(board, recipientId, subtask, { subtype: 'dependency' });
        this.tasks[taskname].dependencyIds.push(requestId);
        this.setSubagentStatus(subagentId, 'busy');
        return requestId;
    }

    assignTaskToSubagent(taskName, board) {
        const freeSubAgents = this.allocateSubagents(1);
        const subagentId = freeSubAgents[0];
        const requestId = this.requestTask(board, subagentId, taskName, { subtype: 'execution' });
        this.tasks[taskName].executionIds.push(requestId);
        this.setSubagentStatus(subagentId, 'busy');
        return requestId;
    }

    // Check if any tasks require action
    evaluateTasks(postBoard) {
        this.taskNames.forEach((taskName, idx) => {
            if (this.tasks[taskName].dependencyIds.length === 0 && this.tasks[taskName].executionIds.length === 0) {
                if (idx === 0) { // If it's the first task, then agent deals with it itself
                    const requestId = this.requestTask(postBoard, 'jcha', taskName, { subtype: 'execution' });
                    this.tasks[taskName].executionIds.push(requestId);
                } else {
                    this.assignTaskToSubagent(taskName, postBoard);
                }
                // const requestId = this.requestTask(postBoard, 'jcha', taskName, { subtype: 'execution' });
                // this.tasks[taskName].executionIds.push(requestId);
            }
        });
    }

    getTaskByRequestId(id) {
        return this.taskNames.find(taskname => this.tasks[taskname].requestId === id);
    }

    getTaskByExecutionId(id) {
        return this.taskNames.find(taskname => this.tasks[taskname].executionIds.includes(id));
    }

    getRequestIdByTaskName(taskName) {
        return this.tasks[taskName].requestId;
    }

    postRequest(board, contents) {
        const postedContents = contents;
        postedContents.msgType = 'request';
        const requestID = this.sendMessage(board, postedContents);
        return requestID;
    }

    processMessages(board) {
        const responsesFromAgent = board.getMessagesFromAgent(this.id).filter(message => message.msgType === 'response');
        const msgsForAgent = board.getMessagesForAgent(this.id).filter(message => { // Filter out messages that have already been responded to by self
            const hasResponseFromSelf = message =>
                responsesFromAgent.some(response => response.requestId === message.msgId)
            return message.msgType === 'response' || !hasResponseFromSelf(message);
        });

        msgsForAgent.forEach(message => {
            if (message.msgType === 'request') {
                this.processRequest(message);
            } else if (message.msgType === 'response') {
                this.processResponse(message, board);
            } else if (message.msgType === 'note') {
                this.processNote(message, board);
            } else {
                throw `Error: unknown message type: '${message.msgType}'`;
            }
        });
    }

    processRequest(request) {
        const taskList = this.taskNames;
        if (!taskList.includes(request.taskName) && !requestIgnoreList.includes(request.msgId)) {
            this.tasks[request.taskName] = {
                requestId: request.msgId,
                dependencyIds: [],
                executionIds: [],
                dependentIds: []
            };
        }
    }

    processNote(note) {
        if (note.note === 'add_dependent') {
            const dependencyTask = note.data.dependencyTask;
            if (!this.tasks[dependencyTask].dependentIds.includes(note.msgId)) {
                this.tasks[dependencyTask].dependentIds.push(note.msgId);
            }
        }
    }

    processResponse(response, board) {
        if (response.response === 'split_task') {
            const numAgentsNeeded = response.data.subtasks.length;
            const freeSubAgents = this.allocateSubagents(numAgentsNeeded);
            const taskname = this.getTaskByExecutionId(response.requestId);
            response.data.subtasks.forEach((subtask, i) => this.assignSubtask(taskname, subtask, freeSubAgents[i], board));
            this.tasks[taskname].executionIds = this.tasks[taskname].executionIds.filter(id => id !== response.requestId);
        } else if (response.response === 'dependencies_needed') {
            const recipientIds = Object.keys(response.data.dependencies);
            const taskName = board.getMessage(response.requestId).taskName;
            const note = 'add_dependent';
            recipientIds.forEach(recipientId => {
                const dependencyTaskName = response.data.dependencies[recipientId];
                dependencyTaskName.forEach(dependencyTask => {
                    const otherContents = {
                        subtype: 'dependency',
                        data: {
                            dependencyTask: dependencyTask,
                            taskValue: 'tbd' // used to determine task priority
                        }
                    };
                    const noteId = this.sendNote(board, recipientId, note, otherContents);
                    this.addToDependencyList(taskName, noteId);
                });
            });
        } else if (response.response === 'done') {
            const requestId = response.requestId;
            if (response.subtype === 'execution') {
                const correspondingTask = this.taskNames.find(taskName => this.tasks[taskName].executionIds.includes(requestId));
                const sourceRequestId = this.tasks[correspondingTask].requestId;
                this.respond(board, sourceRequestId, 'done');
                this.tasks[correspondingTask].dependentIds.forEach(dependentId => { // tell any dependents that task is done
                    this.respond(board, dependentId, 'done');
                });
                this.addToRequestIgnoreList(sourceRequestId); // adds source request id to ignore list
                delete this.tasks[correspondingTask];
            } else if (response.subtype === 'dependency') {
                const correspondingTask = this.taskNames.find(taskName => this.tasks[taskName].dependencyIds.includes(requestId));
                const sourceRequestId = this.tasks[correspondingTask].requestId;
                this.tasks[correspondingTask].dependencyIds = removeFromArray(this.tasks[correspondingTask].dependencyIds, response.requestId); // removes from dependencyIds of task
            }
            if (this.subagents.busy.includes(response.senderId)) { // de-allocate subagent
                this.setSubagentStatus(response.senderId, 'free');
            }
        }
        board.archive(response.msgId);
        board.archive(response.requestId);
    }

    readRequests(board) {
        return board.getRequestsForAgent(this.id);
    }

    requestTask(board, recipientID, task, otherContents) {
        const contents = {
            recipientID: recipientID,
            taskName: task,
            ...otherContents
        }
        return this.postRequest(board, contents);
    }

    postResponse(board, requestId, responseData) {
        const postedContents = responseData;
        const originalRequest = board.getMessage(requestId);
        postedContents.msgType = 'response';
        postedContents.subtype = originalRequest.subtype;
        postedContents.requestId = requestId;
        postedContents.recipientID = originalRequest.senderId;
        const responseId = this.sendMessage(board, postedContents);
        return responseId;
    }

    respond(board, requestId, responseMsg, data) {
        const responseData = { response: responseMsg };
        if (responseMsg === 'split_task') {
            responseData.data = data;
        } else if (responseMsg === 'done') {
        } else if (responseMsg === 'dependencies_needed') {
            responseData.data = data;
        }
        return this.postResponse(board, requestId, responseData);
    }

    save(dataPath = `${AGENT_PATH}/active`) {
        const selfExport = 'module.exports = ' + JSON.stringify(this, null, 4);
        try {
            fs.writeFileSync(`${dataPath}/${this.id}.js`, selfExport);
        } catch (e) {
            console.error(e);
        }
    }

    sendMessage(board, contents)  {
        const postedContents = contents;
        postedContents.senderId = this.id;
        const requestID = board.postMessage(postedContents);
        return requestID;
    }

    sendNote(board, recipientId, note, otherContents) {
        const contents = {
            recipientID: recipientId,
            msgType: 'note',
            note: note,
            ...otherContents
        };
        return this.sendMessage(board, contents);
    }

    setData(dataPath) {
        const agentData = requireNoCache(dataPath);
        for (const dataItem in agentData) {
            this[dataItem] = agentData[dataItem];
        }
    }

    setSubagentStatus(subagentId, newStatus) {
        if (newStatus === 'busy') {
            this.subagents.free = this.subagents.free.filter(freeSubagentId => freeSubagentId !== subagentId);
            this.subagents.busy.push(subagentId);
        } else if (newStatus === 'free') {
            this.subagents.busy = this.subagents.busy.filter(busySubagentId => busySubagentId !== subagentId);
            this.subagents.free.push(subagentId);
        }
    }

    spawnSubAgent(dataPath = `${AGENT_PATH}/active`) {
        const subAgent = new Agent('agent_' + genNewId(AGENT_PATH));
        subAgent.superagent = this.id;
        this.subagents.free.push(subAgent.id);
        subAgent.save(dataPath);
        return `${dataPath}/${subAgent.id}.js`;
    }

    spawnSubAgents(numSubagents, dataPath = `${AGENT_PATH}/active`) {
        for (let i = 0; i < numSubagents; i++) {
            this.spawnSubAgent(dataPath);
        }
        // Array(numSubagents).fill('0').forEach(slot => this.spawnSubAgent(dataPath));
    }

    takeNewTasks(board) {
        const selfRequestsList = this.readRequests(board);
        const taskList = this.taskNames;
        function addTaskFromRequest(tasks, nextRequest) {
            tasks[nextRequest.taskName] = {
                requestId: nextRequest.msgId,
                dependencyIds: [],
                executionIds: []
            };
            return tasks;
        }
        const newTasks = selfRequestsList.filter(request => !taskList.includes(request.taskName))
                                         .reduce(addTaskFromRequest, {});
        this.tasks = { ...this.tasks, ...newTasks };
    }
}

class EndpointAgent extends Agent {
    act(board) {
        this.save();
        this.processMessages(board);
        this.save();
    }

    processMessages(board) {
        const msgsForAgent = board.getMessagesForAgent(this.id);
        msgsForAgent.forEach(message => {
            if (message.msgType === 'response' && message.response === 'done') {
                board.archive(message.msgId);
                board.archive(message.requestId);
            } else {
                throw `Error: Agent '${this.id}' with subtype '${this.subtype} cannot process message: '${message}'`;
            }
        });
    }
}

class HumanAgent extends Agent {
    act(board) {
        this.save();
        this.processMessages(board);
        this.save();
    }

    processMessages(board) {
        const msgsForAgent = board.getMessagesForAgent(this.id);
        msgsForAgent.forEach(message => {
            if (message.msgType === 'request') {
                this.processRequest(message);
            } else {
                throw `Error: Agent '${this.id}' with subtype '${this.subtype} cannot process message: '${message}'`;
            }
        });
    }

    respondDone(board, requestId) {
        this.respond(board, requestId, 'done');
        this.addToRequestIgnoreList(requestId); // adds source request id to ignore list
        delete this.tasks[this.getTaskByRequestId(requestId)];
        this.save();
    }

    respondSplit(board, requestId, subtasks) {
        const responseMsg = 'split_task';
        const data = { subtasks };
        this.respond(board, requestId, responseMsg, data);
        this.addToRequestIgnoreList(requestId); // adds source request id to ignore list
        delete this.tasks[this.getTaskByRequestId(requestId)];
        this.save();
    }
}

function createAgentFromFile(fileName, dataPath = `${AGENT_PATH}/active`) {
    const agentData = requireNoCache(`${dataPath}/${fileName}`);
    let agent;
    if (agentData.subtype === 'endpoint') {
        agent = new EndpointAgent();
    } else if (agentData.subtype === 'human') {
        agent = new HumanAgent();
    } else {
        agent = new Agent();
    }
    agent.setData(`${dataPath}/${fileName}`);
    return agent;
}

class AgentRunner {
    constructor(board) {
        this.board = board;
    }

    runRound(board = this.board) {
        const agentList = fs.readdirSync(`${AGENT_PATH}/active`);
        for (const agentFileName of agentList) {
            const agent = createAgentFromFile(agentFileName, `${AGENT_PATH}/active`);
            agent.act(board);
        }
    }
}

class MessageBoard {

    constructor(messagePath) {
        if (messagePath) {
            this.messagePath = messagePath;
        } else {
            this.messagePath = `${MESSAGE_PATH}/active`;
        }
    }

    get msgList() {
        return fs.readdirSync(this.messagePath).map(fileName => fileName.replace('.js', ''));
    }

    archive(id) {
        saveData(this.getMessage(id), `${MESSAGE_PATH}/inactive/${id}.js`);
        fs.unlinkSync(`${this.messagePath}/${id}.js`);
    }

    getMessage(id) {
        return this.msgList.filter(msgId => msgId === id.toString())
                           .map(msgId => requireNoCache(`${this.messagePath}/${msgId}.js`))[0];
    }

    getMessagesForAgent(agentID) {
        return this.msgList.map(msgId => {
            return requireNoCache(`${this.messagePath}/${msgId}.js`);
        })
        .filter(message => message.recipientID === agentID);
    }

    getRequestsForAgent(agentID) {
        return this.getMessagesForAgent(agentID).filter(message => message.msgType === 'request');
    }

    postMessage(givenContents) {
        const postedContents = givenContents;
        const msgId = 'message_' + genNewId(MESSAGE_PATH);
        postedContents.msgId = msgId;
        saveData(postedContents, `${this.messagePath}/${msgId}.js`);
        return msgId;
    }
}

module.exports = {createAgentFromFile, Agent, AgentRunner, MessageBoard, genNewId};
