const fs = require('fs');
const { attachProperties, reorderAgentNames, requireNoCache, requireAdaptive } = require('./utils/misc.js')
const ENV = process.argv[2] || 'test2';
const AGENT_PATH = `./boards/${ENV}/agents`;
const MESSAGE_PATH = `./boards/${ENV}/messages`;
const SWARM_PATH = `./boards/${ENV}/swarms`;
const EVENTS_PATH = `./boards/${ENV}/events`;
const LIB_PATH = `./lib`;
const GLOBALS = require(`./boards/${ENV}/globals.js`)

const requestIgnoreList = [];

function saveData(contents, dataPath) {
    const selfExport = 'module.exports = ' + JSON.stringify(contents, null, 4);
    fs.writeFile(dataPath, selfExport, err => {
        if (err) {
            throw err;
        }
    });
}

function removeFromArray(array, elementToRemove) {
    return array.filter(element => element !== elementToRemove);
}

let id_suffix = 0;
function genNewId(path, stashedNum = 0) {
    const activeNum = fs.readdirSync(`${path}/active`).length;
    const inactiveNum = fs.readdirSync(`${path}/inactive`).length;
    id_suffix = id_suffix + 1;
    return (activeNum + inactiveNum + stashedNum) + '_' + id_suffix;
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
        return reorderAgentNames(this.subagents.free);
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

    getAgentByTaskName(board, taskName) {
        const taskMessageId = this.getRequestIdByTaskName(taskName);
        const taskMessage = board.getMessage(taskMessageId);
        return taskMessage.senderId;
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

        try {
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
        } catch(e) {
            console.error('Unable to process messages:');
            console.error(e);
            console.debug("Messages for Agent:")
            console.debug(msgsForAgent)
        }
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
            this.tasks[taskName].executionIds = removeFromArray(this.tasks[taskName].executionIds, response.requestId);
        } else if (response.response === 'done') {
            const requestId = response.requestId;
            if (response.subtype === 'execution') {
                const correspondingTask = this.taskNames.find(taskName => this.tasks[taskName].executionIds.includes(requestId));
                const sourceRequestId = this.tasks[correspondingTask].requestId;
                this.respond(board, sourceRequestId, 'done');
                this.tasks[correspondingTask].dependentIds.forEach(dependentId => { // tell any dependents that task is done
                    this.respond(board, dependentId, 'done');
                });
                delete this.tasks[correspondingTask];
            } else if (response.subtype === 'dependency') {
                const correspondingTask = this.taskNames.find(taskName => this.tasks[taskName].dependencyIds.includes(requestId));
                // console.warn(requestId)
                // console.warn(this.taskNames)
                // console.warn(this.tasks)
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
        this.addToRequestIgnoreList(requestId);
        return this.postResponse(board, requestId, responseData);
    }

    respondDependency(board, requestId, dependencies) {
        const responseMsg = 'dependencies_needed';
        const data = { dependencies };
        this.respond(board, requestId, responseMsg, data);
        delete this.tasks[this.getTaskByRequestId(requestId)];
        this.save();
    }

    respondDone(board, requestId) {
        this.respond(board, requestId, 'done');
        delete this.tasks[this.getTaskByRequestId(requestId)];
        this.save();
    }

    respondSplit(board, requestId, subtasks) {
        const responseMsg = 'split_task';
        const data = { subtasks };
        this.respond(board, requestId, responseMsg, data);
        delete this.tasks[this.getTaskByRequestId(requestId)];
        this.save();
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

    setData(agentData) {
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
    agent.setData(agentData);
    return agent;
}

class AgentRunner {
    constructor(board) {
        this.board = board;
    }

    runRound(board = this.board) {
        const agentList = board.getAgentsWithMsgs();
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

    stashInactiveMsgs() {
        const msgList = fs.readdirSync(`${MESSAGE_PATH}/inactive`);
        msgList.forEach(msgName => {
            const oldPath = `${MESSAGE_PATH}/inactive/${msgName}`;
            const newPath = `${MESSAGE_PATH}/stashed/${msgName}`;
            fs.renameSync(oldPath, newPath);
        });
        const globalsPath = `./boards/${ENV}/globals.js`;
        GLOBALS.stashedNum = fs.readdirSync(`${MESSAGE_PATH}/stashed`).length;
        saveData(GLOBALS, globalsPath);
    }

    archive(id) {
        saveData(this.getMessage(id), `${MESSAGE_PATH}/inactive/${id}.js`);
        fs.unlinkSync(`${this.messagePath}/${id}.js`);
    }

    // fetches list of agents that actually have messages for them
    getAgentsWithMsgs() {
        const allMessages = this.getAllMessages();
        const recipients = [...new Set(allMessages.map(message => message.recipientID))];
        return recipients;
    }

    getAllMessages() {
        return this.msgList.map(msgId => requireAdaptive(`${this.messagePath}/${msgId}.js`));
    }

    getMessage(id) {
        // console.log(id)
        // console.log(this.msgList.filter(msgId => msgId === id.toString())
                           // .map(msgId => requireAdaptive(`${this.messagePath}/${msgId}.js`))[0])
        return this.msgList.filter(msgId => msgId === id.toString())
                           .map(msgId => requireAdaptive(`${this.messagePath}/${msgId}.js`))[0];
    }

    getMessages(filter) {
        const filteredMsgs = this.getAllMessages().filter(filter);
        return filteredMsgs;
    }

    getMessagesForAgent(agentId) {
        function filterForAgent(message) {return message.recipientID === agentId};
        return this.getMessages(filterForAgent);
        // return this.msgList.map(msgId => {
        //     let messageCached = require(`${this.messagePath}/${msgId}.js`);
        //     if (Object.keys(messageCached).length !== 0) { // If the cached require works, then return it, otherwise return the no-cache version
        //         return messageCached;
        //     }
        //     return requireNoCache(`${this.messagePath}/${msgId}.js`);
        // })
        //     .filter(message => message.recipientID === agentId);
    }

    getMessagesFromAgent(agentId) {
        function filterFromAgent(message) {message.senderId === agentId};
        return this.getMessages(filterFromAgent);
        // return this.msgList.map(msgId => {
        //     let messageCached = require(`${this.messagePath}/${msgId}.js`);
        //     if (Object.keys(messageCached).length !== 0) { // If the cached require works, then return it, otherwise return the no-cache version
        //         return messageCached;
        //     }
        //     return requireNoCache(`${this.messagePath}/${msgId}.js`);
        // })
        //     .filter(message => message.senderId === agentId);
    }

    getRequestsForAgent(agentID) {
        return this.getMessagesForAgent(agentID).filter(message => message.msgType === 'request');
    }

    postMessage(givenContents) {
        const postedContents = givenContents;
        const msgId = 'message_' + genNewId(MESSAGE_PATH, GLOBALS.stashedNum);
        postedContents.msgId = msgId;
        saveData(postedContents, `${this.messagePath}/${msgId}.js`);
        return msgId;
    }
}

class SwarmSystem {
    constructor(superSwarm, data, alwaysActiveList = [], LarvaClass) {
        this.superSwarm = superSwarm;
        this.memberList = {};
        this.data = data;
        this.alwaysActiveList = alwaysActiveList;
        this.LarvaClass = LarvaClass;
    }

    get activeMembers() {
        return this.alwaysActiveList.reduce((returnedSwarms, member) => {
            if (!returnedSwarms.includes(member)) {
                return returnedSwarms.concat([member]);
            } else {
                return returnedSwarms;
            }
        }, Object.keys(this.memberList));
    }

    act() {
        this.activeMembers.forEach(name => {
            this.getMember(name).act();
        });
    }

    getMember(name) {
        const returnedMember = this.memberList[name] || this.spawnMember(name);
        return returnedMember;
    }

    spawnMember(name) {
        const larva = new LarvaClass(this);
        return growLarva(larva, name);
    }

    growLarva(larva, name) {
        const member = larva.metamorphose();
        this.memberList[name] = member;
        return member;
    }
}

class Overmind extends SwarmSystem {
    constructor(data) {
        super(null, data, ['weavers'], null);
    }

    getSwarm(type) {
        return this.getMember(type);
    }

    spawnMember(type) {
        const swarm = new Swarm(this, type);
        this.memberList[type] = swarm;
        return swarm;
    }
}

class Swarm extends SwarmSystem {
    constructor(overswarm, type) {
        super(overswarm, null, [], SwarmlingLarva);
        this.type = type;
        const { dictionary } = overswarm.data;
        this.data = { dictionary };
    }

    get path() {
        if (this.type === 'weavers') {
            return `${SWARM_PATH}/weavers`;
        } else {
             return 'unknown_type';
        }
    }

    getSwarmling(name) {
        return this.getMember(name);
    }

    // creates a swarmling in a name slot
    spawnMember(name) {
        const larva = new this.LarvaClass(this, this.type, name, this.path);
        return this.growLarva(larva, name);
    }
}

class SwarmlingLarva {
    constructor(swarm, type, name, path) {
        this.type = type;
        this.name = name;
        this.path = path;
        this.swarm = swarm;
    }

    // generate whatever the larva was supposed to be for
    metamorphose() {
        if (this.type === 'weavers') {
            return WeaverBot.createFromBlueprint(this.name, this.path, this.swarm);
        }
    }
}

// Bots process globally available events instead of directed messages, and perform orthogonal functions from agents, e.g. workstream management
class Bot {
    static fetchBlueprint(name, dataPath) {
        return require(`${dataPath}/${name}/blueprint.js`);
    }

    constructor(swarm, id) {
        this.id = id;
        this.type = 'bot';
        this.swarm = swarm;
        this.data = {};
    }

    get path() {
        return `${this.swarm.path}/${this.id}`;
    }

    act() {
        saveData(this.data, `${this.path}/data.js`);
    }

    attachData() {
        this.data = this.fetchData();
    }

    // fetches data from data file
    fetchData() {
        const dataPath = `${this.path}/data.js`;
        return require(dataPath);
    }

    // sets property to library function if it's not already a function
    mapSpecToLibVals(specName) {
        const specVal = this[`_${specName}`];
        if (typeof specVal === 'function') {
            return specVal;
        } else if ((typeof specVal === 'string') && (specVal !== '')) {
            return require(`${LIB_PATH}/${specName}.js`)[specVal];
        } else {
            return null;
        }
    }
}

class WeaverBot extends Bot {
    static dataPath = `${SWARM_PATH}/weavers`;

    static get weaverList() {
        const workstreamList = fs.readdirSync(WeaverBot.dataPath);
        return workstreamList;
    }

    static defaults = {
        filter: () => true,
        sort: () => 0,
        weave: (dictionary, sources, filter, sort) => { // by default, weave() concatentates the sources, filters, then sorts
            const concatenated = Object.keys(sources).reduce((accumulator, source) => accumulator.concat(sources[source]), []);
            const filtered = concatenated.filter(filter);
            const sorted = filtered.sort(sort);
            return sorted;
        }
    }

    static createFromBlueprint(name, dataPath, swarm) {
        const blueprint = Bot.fetchBlueprint(name, dataPath);
        let weaver = new WeaverBot(swarm);
        attachProperties(weaver, blueprint);
        weaver.attachData();
        return weaver;
    }

    // sourceList is an object of either workstreams or objects; filter() and order() are both functions, while weave() applies them to sourceList
    constructor(swarm, id, dictionary = {}, sources = {}, { filter = () => true, sort = () => 0, weave } = {}) {
        super(swarm, id);
        this._dictionary = dictionary;
        this._sources = sources; // sources can be workstreams or objects, but when they're called, they're converted to objects
        this._filter = filter;
        this._sort = sort;
        this._weave = weave || ((dictionary, sources, filter, sort) => { // by default, weave() concatentates the sources, filters, then sorts
            const concatenatedSources = sources.reduce((accumulator, source) => accumulator.concat(source));
            const filteredSources = concatenatedSources.filter(filter);
            const sortedSources= filteredSources.sort(sort);
            return sortedSources;
        });
        this.subtype = 'weaver';
    }

    get dictionary() {
        let dictVal;
        if (Object.keys(this._dictionary).length > 0) { // if dictionary is explicitly defined for the weaver, then use that
            dictVal = this._dictionary;
        } else { // otherwise, use the dictionary in the swarm's dictionary
            dictVal = this.swarm.data.dictionary;
        }
        return typeof dictVal === 'function' ?
            dictVal()
            : dictVal;
    }

    get filter() {
        return this.mapSpecToLibVals('filter') || WeaverBot.defaults.filter;
    }

    get sort() {
        return this.mapSpecToLibVals('sort') || WeaverBot.defaults.sort;
    }

    get weave() {
        return this.mapSpecToLibVals('weave') || WeaverBot.defaults.weave;
    }

    get sources() {
        const returnedSources = {};
        Object.keys(this._sources).forEach(sourceName => {
            const sourceValue = this._sources[sourceName];
            const mappedSourceValue =
                (Array.isArray(sourceValue) ? sourceValue // if source is an array, just keep it
                : (sourceValue === 'dict' ? Object.keys(this.dictionary) // if source is dictionary, then use dictionary keys
                : (typeof sourceValue === "string" ? this.swarm.getSwarmling(sourceValue).streamList // if source is a weaver, then assume it's the name of a weaver bot and pull in its streamlist
                : Error(`Invalid source value format: ${sourceName}`))));
            returnedSources[sourceName] = mappedSourceValue;
        });
        return returnedSources;
    }

    get streamList() {
        return this.weave(this.dictionary, this.sources, this.filter, this.sort);
    }

    next() {
        return this.streamList[0];
    }
}

module.exports = { createAgentFromFile, Agent, AgentRunner, MessageBoard, Bot, WeaverBot, genNewId, Overmind, Swarm };
