const fs = require('fs');
const AGENT_PATH = './agents/active'
const MESSAGE_PATH = './messages/active'


function saveData(contents, dataPath) {
    const selfExport = 'module.exports = ' + JSON.stringify(contents, null, 4);
    fs.writeFile(dataPath, selfExport, err => {
        if (err) {
            console.error(err)
            return
        }
    })
}

class Agent {
    constructor(id, defaultBoard) {
        this.id = id;
        this.defaultBoard = defaultBoard;
    }

    act() {
        console.log("Agent acted!")
    }

    postRequest(board = this.defaultBoard, contents) {
        const requestID = board.postMessage('request', contents);
        return requestID;
    }

    save(dataPath = AGENT_PATH) {
        const selfExport = 'module.exports = ' + JSON.stringify(this, null, 4);
        fs.writeFile(`${dataPath}/${this.id}.js`, selfExport, err => {
            if (err) {
                console.error(err)
                return
            }
        })
    }

    setData(dataPath) {
        const agentData = require(dataPath);
        for (const dataItem in agentData) {
            this[dataItem] = agentData[dataItem];
        }
    }
}

function createAgent(fileName, dataPath = AGENT_PATH) {
    const agent = new Agent();
    agent.setData(`${dataPath}/${fileName}`);
    return agent;
}

class AgentRunner {
    runRound() {
        const agentList = fs.readdirSync(AGENT_PATH);
        for (const agentFileName of agentList) {
            const agent = createAgent(agentFileName, AGENT_PATH);
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

    postMessage(msgType, givenContents) {
        const postedContents = givenContents;
        const msgId = 'dummy_1';
        postedContents.msgType = msgType;
        saveData(postedContents, `${this.messagePath}/${msgId}.js`);
    }

}





module.exports = {createAgent, Agent, AgentRunner, MessageBoard};
