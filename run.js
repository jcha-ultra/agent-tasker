const fs = require('fs');
const AGENT_PATH = './agents';
const MESSAGE_PATH = './messages';


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
        this.processMessages(board);
        this.evaluateTasks(board);
        this.save();
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
    }

    // Check if any tasks require action
    evaluateTasks(postBoard) {
        Object.keys(this.tasks).forEach(taskName => {
            if (this.tasks[taskName].dependencyIds.length === 0 && this.tasks[taskName].executionIds.length === 0) {
                const requestId = this.requestTask(postBoard, '0_human', taskName, { subtype: 'execution' });
                this.tasks[taskName].executionIds.push(requestId);
            }
        });
    }

    getTaskByRequestId(id) {
        return Object.keys(this.tasks).find(taskname => this.tasks[taskname].requestId === id);
    }

    getTaskByExecutionId(id) {
        return Object.keys(this.tasks).find(taskname => this.tasks[taskname].executionIds.includes(id));
    }

    postRequest(board, contents) {
        const postedContents = contents;
        postedContents.msgType = 'request';
        const requestID = this.sendMessage(board, postedContents);
        return requestID;
    }

    processMessages(board) {
        const msgsForAgent = board.getMessagesForAgent(this.id);
        msgsForAgent.forEach(message => {
            if (message.msgType === 'request') {
                this.processRequest(message);
            } else if (message.msgType === 'response') {
                this.processResponse(message, board);
            } else {
                throw `Error: unknown message type: ${message.msgType}`;
            }
        });
    }

    processRequest(request) {
        const taskList = Object.keys(this.tasks);
        if (!taskList.includes(request.taskName)) {
            this.tasks[request.taskName] = {
                requestId: request.msgId,
                dependencyIds: [],
                executionIds: []
            };
        }
    }

    processResponse(response, board) {
        if (response.response === 'split_task') {
            const numAgentsNeeded = response.data.subtasks.length;
            const freeSubAgents = this.allocateSubagents(numAgentsNeeded);
            const taskname = this.getTaskByExecutionId(response.requestId);
            response.data.subtasks.forEach((subtask, i) => this.assignSubtask(taskname, subtask, freeSubAgents[i], board));
            this.tasks[taskname].executionIds = this.tasks[taskname].executionIds.filter(id => id !== response.requestId);
        } else if (response.response === 'done') {
            const requestId = response.requestId;
            if (response.subtype === 'execution') {
                const correspondingTask = this.taskNames.find(taskName => this.tasks[taskName].executionIds.includes(requestId));
                const sourceRequestId = this.tasks[correspondingTask].requestId;
                this.respond(board, sourceRequestId, 'done');
                delete this.tasks[correspondingTask];
            } else if (response.subtype === 'dependency') {
                const correspondingTask = this.taskNames.find(taskName => this.tasks[taskName].dependencyIds.includes(requestId));
                const sourceRequestId = this.tasks[correspondingTask].requestId;
                this.tasks[correspondingTask].dependencyIds = removeFromArray(this.tasks[correspondingTask].dependencyIds, response.requestId); // removes from dependencyIds of task
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
        if (responseMsg === 'split') {
            this.postResponse(board, requestId, {
                response: 'split_task',
                data: data
            });
        } else if (responseMsg === 'done') {
            this.postResponse(board, requestId, {
                response: 'done'
            });
        }
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

    setData(dataPath) {
        const agentData = require(dataPath);
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
        const taskList = Object.keys(this.tasks);
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

function createAgentFromFile(fileName, dataPath = `${AGENT_PATH}/active`) {
    const agent = new Agent();
    agent.setData(`${dataPath}/${fileName}`);
    return agent;
}

class AgentRunner {
    runRound() {
        const agentList = fs.readdirSync(`${AGENT_PATH}/active`);
        for (const agentFileName of agentList) {
            const agent = createAgentFromFile(agentFileName, `${AGENT_PATH}/active`);
            agent.act();
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
                           .map(msgId => require(`${this.messagePath}/${msgId}.js`))[0];
    }

    getMessagesForAgent(agentID) {
        return this.msgList.map(msgId => {
            return require(`${this.messagePath}/${msgId}.js`);
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
