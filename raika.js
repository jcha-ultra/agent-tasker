const readline = require("readline");
const { createAgentFromFile, AgentRunner } = require('./run.js');


class Raika {
    constructor(board) {
        this.board = board;
        this.agentRunner = new AgentRunner(board);
        this.raikaAgent = createAgentFromFile('raika_agent.js');
    }

    start() {
        return new Promise((resolve, reject) => {
            const agentRunner = this.agentRunner;
            const raikaAgent = this.raikaAgent;
            const jcha = this.jcha;
            const board = this.board;

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.on("close", () => {
                console.log("\nBye!");
                // process.exit(0);
                resolve();
            });

            const addTask = (function (newTask, board = this.board) {
                raikaAgent.requestTask(board, 'source', newTask, { subtype: 'execution'});
            }).bind(this);

            const getHumanAgent = (function (agentName = 'jcha') {
                const humanAgent = createAgentFromFile(`${agentName}.js`);
                return humanAgent;
            }).bind(this);

            const getHumanTasks = (function (agentName = 'jcha') {
                return getHumanAgent(agentName).taskNames;
            }).bind(this);

            const sendDone = (function (requestId, board = this.board, agentName = 'jcha') {
                const humanAgent = createAgentFromFile(`${agentName}.js`);
                humanAgent.respondDone(board, requestId);
            }).bind(this);

            class FlowStep {
                constructor(promptText, inputType, actions) {
                    this.promptText = promptText;
                    this.inputType = inputType;
                    this.actions = actions;

                    if (this.inputType === 'choice') {
                        this.performAction = (choiceNum, data) => {
                            const chosenAction = Object.keys(this.actions)[parseInt(choiceNum) - 1];
                            data.chosenAction = chosenAction;
                            data.nextStep = this.actions[chosenAction].perform(data);
                            return data;
                        }
                    } else if (this.inputType === 'freeform') {
                        this.performAction = (input, data) => {
                            data.input = input;
                            data.nextStep = this.actions.action.perform(input, data);
                            return data;
                        }
                    }
                }

                get fullPromptText() {
                    if (this.inputType === 'choice') {
                        const choices = Object.keys(this.actions)
                        .map(action => this.actions[action].displayedCopy)
                        .reduce((choiceString, choice, idx) => `${choiceString}${idx + 1}. ${choice}\n`, '');
                        return `\n${this.promptText}\n${choices}\n`;
                    } else {
                        return `\n${this.promptText}\n`
                    }
                }

                execute(data = {}) {
                    rl.question(this.fullPromptText, input => {
                        const nextData = this.performAction(input, data);
                        if (nextData.nextStep) {
                            nextData.nextStep.execute(nextData);
                        }
                    });
                }
            }

            const createChoiceStep = (function (choiceList, performFunc) {
                const createdChoices = choiceList.reduce((choicesObj, choice) => {
                    choicesObj[choice] = {
                        displayedCopy: choice,
                        perform: performFunc
                    }
                    return choicesObj;
                }, {});
                return createdChoices;
            }).bind(this);

            const createTaskSelectionStep = (function (tasks) {
                const performFunc = (data) => {
                    const taskChosen = data.chosenAction;
                    return createTaskActionsStep(taskChosen);
                }
                return new FlowStep(
                    'Tasks for jcha:',
                    'choice',
                    createChoiceStep(tasks, performFunc)
                );
            }).bind(this);

            const createTaskActionsStep = (function (taskChosen) {
                return new FlowStep(
                    `What do you want to do with the task '${taskChosen}'?`,
                    'choice',
                    {
                        done: {
                            displayedCopy: 'mark the task as done',
                            perform: (data) => {
                                sendDone(getHumanAgent().getRequestIdByTaskName(taskChosen));
                                return initialStep;
                            }
                        },
                        process: {
                            displayedCopy: 'add processing information to the task',
                            perform: () => initialStep
                        },
                        split_task: {
                            displayedCopy: 'split the task',
                            perform: () => initialStep
                        },
                        dependencies_needed: {
                            displayedCopy: 'add dependencies to the task',
                            perform: () => initialStep
                        },
                    }
                );
            }).bind(this);

            const initialStep = new FlowStep(
                'Hi! What would you like to do?',
                'choice',
                {
                    addTask: {
                        displayedCopy: 'add a new task',
                        perform: () => addTaskStep
                    },
                    getHumanTasks: {
                        displayedCopy: 'get tasks for agent jcha',
                        perform: (data) => {
                            const tasks = getHumanTasks('jcha');
                            // console.log(`Tasks for jcha:\n${JSON.stringify(tasks, null, '    ')}`);
                            return createTaskSelectionStep(tasks);
                        }
                    },
                    runRound: {
                        displayedCopy: 'run a round of agent actions',
                        perform: (data) => {
                            agentRunner.runRound();
                            console.log('Ran a round of agent actions');
                            return initialStep;
                        }
                    },
                    exit: {
                        displayedCopy: 'exit',
                        perform: () => {
                            rl.close();
                            const nextStep = null;
                            return nextStep;
                        }
                    },
                },
            );

            const addTaskStep = new FlowStep(
                'What task would you like to add?',
                'freeform',
                {
                    action: {
                        perform: (taskInput, data) => {
                            console.log(`Adding new task: '${taskInput}'`)
                            addTask(taskInput);
                            const nextStep = initialStep;
                            return nextStep;
                        }
                    }
                }
            );


            initialStep.execute();

        });
    }
}

module.exports = Raika;
