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
    constructor(name) {
        this.name = name;
    }

    act() {
        console.log("Agent acted!")
    }

    createMessage(messageName, contents) {
        saveData(contents, `${MESSAGE_PATH}/${messageName}.js`);
    }

    save(dataPath = AGENT_PATH) {
        const selfExport = 'module.exports = ' + JSON.stringify(this, null, 4);
        fs.writeFile(`${dataPath}/${this.name}`, selfExport, err => {
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

function createAgent(name, dataPath = AGENT_PATH) {
    const agent = new Agent(name);
    agent.setData(`${dataPath}/${name}`);
    return agent;
}

class AgentRunner {
    runRound() {
        const agentList = fs.readdirSync(AGENT_PATH);
        for (const agentName of agentList) {
            const agent = createAgent(agentName, AGENT_PATH);
            agent.act();
        }
    }
}

module.exports = {createAgent, Agent, AgentRunner};
