const fs = require('fs');
const AGENT_PATH = './agents';
const MESSAGE_PATH = './messages';


function saveData(contents, dataPath) {
    const selfExport = 'module.exports = ' + JSON.stringify(contents, null, 4);
    fs.writeFile(dataPath, selfExport, err => {
        if (err) {
            console.error(err);
            return;
        }
    })
}

function genNewId(path) {
    const activeNum = fs.readdirSync(`${path}/active`).length;
    const inactiveNum = fs.readdirSync(`${path}/inactive`).length;
    return activeNum + inactiveNum;
}

class Agent {
    constructor(id) {
        this.id = id;
        this.tasks = {};
    }

    act() {
        // console.log("Agent acted!");
    }

    allocateSubagents(numAgentsNeeded) {
        const freeSubAgents = this.subagents.filter(subagent => subagent.isFree());
        const numNewSubagentsNeeded = Math.max(0, numAgentsNeeded - freeSubAgents.length);
        let newSubagents = [];
        if (numNewSubagentsNeeded > 0) {
            const newSubagents = spawnSubAgents(numNewSubagentsNeeded);
        }
        return [...freeSubAgents, ...newSubagents];
        // ....
        // ....
        // do: update: createFreeSubagents() -> allocateSubagents(numAgentsNeeded)
        // ....
        // do: create this.subagents
        // do: create this.superagent
        // do: create spawnSubAgents(n)
        // do: set superagent after spawning
        // do: spawnSubAgents need to add to subagent list
        // do: create subagent.isFree();
        // do: update task status after sending out subrequests ('waiting for subtasks')




    getTaskByRequestId(id) {
        return Object.keys(this.tasks).find(taskname => this.tasks[taskname].requestId === id);
    }

    postRequest(board, contents) {
        const postedContents = contents;
        postedContents.msgType = 'request';
        const requestID = this.sendMessage(board, postedContents);
        return requestID;
    }

    processRequest(request) {
        const taskList = Object.keys(this.tasks);
        if (!taskList.includes(request.taskName)) {
            this.tasks[request.taskName] = {
                requestId: request.msgId,
                status: 'new',
                subrequestsIds: []
            };
        }
    }

    processResponse(response, board) {
        if (response.response === 'split_task') {
            const freeSubAgents = createFreeSubagents();
            const taskname = getTaskByRequestId(response.requestId);
            response.data.subtasks.forEach((subtask, i) => {
                const subagent = freeSubAgents[i];
                const recipientId = subagent.id;
                const requestId = this.requestTask(board, recipientId, subtask);
                this.tasks[taskname].subrequestsIds.push(requestId);
            });
        }
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

    readRequests(board) {
        return board.getRequestsForAgent(this.id);
    }

    requestTask(board, recipientID, task) {
        const contents = {
            recipientID: recipientID,
            subtype: 'task',
            taskName: task
        }
        return this.postRequest(board, contents);
    }

    respond(board, requestId, responseData) {
        const postedContents = responseData;
        postedContents.msgType = 'response';
        postedContents.requestId = requestId;
        const responseId = this.sendMessage(board, postedContents);
        return responseId;
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

    save(dataPath = `${AGENT_PATH}/active`) {
        const selfExport = 'module.exports = ' + JSON.stringify(this, null, 4);
        fs.writeFile(`${dataPath}/${this.id}.js`, selfExport, err => {
            if (err) {
                console.error(err)
                return
            }
        })
    }

    spawnSubAgent(dataPath = `${AGENT_PATH}/active`) {
        const subAgent = new Agent('agent_' + genNewId(AGENT_PATH));
        subAgent.save(dataPath);
        return `${dataPath}/${subAgent.id}.js`;
    }

    takeNewTasks(board) {
        const selfRequestsList = this.readRequests(board);
        const taskList = Object.keys(this.tasks);
        function addTaskFromRequest(tasks, nextRequest) {
            tasks[nextRequest.taskName] = {
                requestId: nextRequest.msgId,
                status: 'new',
                subrequestsIds: []
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
