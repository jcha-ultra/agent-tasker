const fs = require('fs');
const AGENT_PATH = './agents';
const MESSAGE_PATH = './messages/active';


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
    }

    act() {
        // console.log("Agent acted!");
    }

    postRequest(board, contents) {
        const requestID = board.postMessage('request', contents);
        return requestID;
    }

    readRequests(board) {
        return board.getRequestsForAgent(this.id);
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
        const subAgent = new Agent(genNewId(AGENT_PATH));
        subAgent.save(dataPath);
        return `${dataPath}/${subAgent.id}.js`;
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
            this.messagePath = MESSAGE_PATH;
        }
    }

    get msgList() {
        return fs.readdirSync(this.messagePath).map(fileName => fileName.replace('.js', ''));
    }

    getRequestsForAgent(agentID) {
        return this.msgList.map(msgID => {
            return require(`${this.messagePath}/${msgID}.js`);
        })
        .filter(message => {
            return message.recipientID === agentID && message.msgType === 'request';
        });
    }

    postMessage(msgType, givenContents) {
        const postedContents = givenContents;
        const msgId = 'dummy_1';
        postedContents.msgType = msgType;
        saveData(postedContents, `${this.messagePath}/${msgId}.js`);
    }

}





module.exports = {createAgentFromFile, Agent, AgentRunner, MessageBoard, genNewId};
