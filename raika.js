const readline = require("readline");
const { createAgentFromFile, AgentRunner } = require('./run.js');


class Raika {
    constructor(board) {
        this.board = board;
        this.agentRunner = new AgentRunner(board);
    }

    start() {
        return new Promise((resolve, reject) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.on("close", () => {
                console.log("\nBye!");
                // process.exit(0);
                resolve();
            });

            const agentRunner = this.agentRunner;

            const addTask = (function (newTask, board = this.board) {
                const raikaAgent = createAgentFromFile('raika_agent.js');
                raikaAgent.requestTask(board, 'source', newTask, { subtype: 'execution'});
            }).bind(this);

            const getHumanTasks = (function (agentName) {
                const humanAgent = createAgentFromFile(`${agentName}.js`);
                return humanAgent.taskNames;
            }).bind(this);

            const actions = {
                'addTask': {
                    displayedCopy: 'add a new task',
                    execute: (rl, actions) => {
                        rl.question('What task would you like to add?\n', newTask => {
                            console.log(`Adding new task: '${newTask}'`);
                            addTask(newTask);
                            prompt(rl, actions);
                        });
                    }
                },
                'getHumanTasks': {
                    displayedCopy: 'get tasks for jcha',
                    execute: (rl, actions) => {
                        const tasks = getHumanTasks('jcha');
                        console.log(`Tasks for jcha:\n${JSON.stringify(tasks, null, '    ')}`);
                        prompt(rl, actions);
                    }
                },
                'runRound': {
                    displayedCopy: 'run a round of agent comms',
                    execute: (rl, actions) => {
                        agentRunner.runRound();
                        prompt(rl, actions);
                    }
                },
                'exit': {
                    displayedCopy: 'exit',
                    execute: (rl, actions) => rl.close()
                },
                'test': {
                    displayedCopy: 'test',
                    execute: (rl, actions) => {
                        console.warn('test!');
                        prompt(rl, actions);
                    }
                }
            };

            function prompt(rl, actions, promptText = 'Raika: Hi! What would you like to do?') {
                const choices = Object.keys(actions).map(action => actions[action].displayedCopy)
                    .reduce((choiceString, choice, idx) => `${choiceString}${idx + 1}. ${choice}\n`, '');
                rl.question(`\n${promptText}\n${choices}`, choiceNum => {
                    const chosenAction = Object.keys(actions)[parseInt(choiceNum) - 1];
                    actions[chosenAction].execute(rl, actions);
                    // if (chosenAction !== 'exit') {
                        // prompt(rl, actions);
                    // }
                });
            }

            prompt(rl, actions);
        })
    }
}

module.exports = Raika;
