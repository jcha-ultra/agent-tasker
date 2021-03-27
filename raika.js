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
                humanAgent.respond(board, requestId, 'done');
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



            // ....

            // function prompt(action, data) {
            //     const nextData = action(data);
            //     if (!nextData) {
            //         return;
            //     }
            //     const { rl, inputType, question, nextActions } = nextData;
            //     if (inputType === 'choice') {
            //         pickChoice(question);
            //     } else if (inputType === 'freeform') {
            //         typeInput(question);
            //     }
            //
            //     function pickChoice(question) {
            //         const choices = Object.keys(nextActions)
            //             .map(action => nextActions[action].displayedCopy)
            //             .reduce((choiceString, choice, idx) => `${choiceString}${idx + 1}. ${choice}\n`, '');
            //         rl.question(`\n${question}\n${choices}`, choiceNum => {
            //             const chosenAction = Object.keys(nextActions)[parseInt(choiceNum) - 1];
            //             const nextAction = nextActions[chosenAction].execute;
            //             prompt(nextAction, nextData);
            //         });
            //     }
            //
            //     function typeInput(question) {
            //         rl.question(`\n${question}`, freeformInput => {
            //             const nextAction = nextActions.execute;
            //             nextData.freeformInput = freeformInput;
            //             prompt(nextAction, nextData);
            //         });
            //     }
            // }
            //
            // function initialAction(data) {
            //     const question = 'Hi! What would you like to do?';
            //     const inputType = 'choice';
            //     const nextActions = {
            //         'exit': {
            //             displayedCopy: 'exit',
            //             execute: exitAction,
            //         },
            //         'addTask': {
            //             displayedCopy: 'add a new task',
            //             execute: addTaskAskAction,
            //         },
            //     };
            //     return { ...data, question, inputType, nextActions };
            // }
            //
            // function exitAction(data) {
            //     const inputType = 'end';
            //     data.rl.close();
            //     return null;
            // }
            //
            // function addTaskAskAction(data) {
            //     const question = 'What task would you like to add?';
            //     const inputType = 'freeform';
            //     const nextActions = {
            //         execute: addTaskAction
            //     };
            //     return { ...data, question, inputType, nextActions };
            // }
            //
            // function addTaskAction(data) {
            //     addTask(data.freeformInput);
            //     console.log(`Adding new task: '${newTask}'`);
            //
            //     const question =
            // }
            //
            //
            //
            // prompt(initialAction, {rl});

            // ....

            // const actions = {
            //     'addTask': {
            //         displayedCopy: 'add a new task',
            //         execute: (rl, actions) => {
            //             rl.question('What task would you like to add?\n', newTask => {
            //                 console.log(`Adding new task: '${newTask}'`);
            //                 addTask(newTask);
            //                 prompt(rl, actions);
            //             });
            //         }
            //     },
            //     'getHumanTasks': {
            //         displayedCopy: 'get tasks for agent jcha',
            //         execute: (rl, actions) => {
            //             const tasks = getHumanTasks('jcha');
            //             const taskActions = createActions(tasks, taskAction});
            //             prompt(rl, taskActions, 'Raika: Here are the list of tasks for jcha');
            //
            //             // console.log(`Tasks for jcha:\n${JSON.stringify(tasks, null, '    ')}`);
            //             // prompt(rl, actions);
            //         }
            //     },
            //     'runRound': {
            //         displayedCopy: 'run a round of agent comms',
            //         execute: (rl, actions) => {
            //             agentRunner.runRound();
            //             prompt(rl, actions);
            //         }
            //     },
            //     'exit': {
            //         displayedCopy: 'exit',
            //         execute: (rl, actions) => rl.close()
            //     },
            //     'test': {
            //         displayedCopy: 'test',
            //         execute: (rl, actions) => {
            //             console.warn('test!');
            //             prompt(rl, actions);
            //         }
            //     }
            // };

            // ....


            // const addTask = (function (newTask, board = this.board) {
            //     const raikaAgent = createAgentFromFile('raika_agent.js');
            //     raikaAgent.requestTask(board, 'source', newTask, { subtype: 'execution'});
            // }).bind(this);
            //
            // const getHumanTasks = (function (agentName) {
            //     const humanAgent = createAgentFromFile(`${agentName}.js`);
            //     return humanAgent.taskNames;
            // }).bind(this);
            //
            // const createActions = (function (actionList, executeFunc) {
            //     const createdActions = actionList.reduce((actionsObj, action) => {
            //         actionsObj[action] = {
            //             displayedCopy: action,
            //             execute: executeFunc
            //         }
            //         return actionsObj;
            //     }, {});
            //     return createdActions;
            // }).bind(this);
            //
            // const actions = {
            //     'addTask': {
            //         displayedCopy: 'add a new task',
            //         execute: (rl, actions) => {
            //             rl.question('What task would you like to add?\n', newTask => {
            //                 console.log(`Adding new task: '${newTask}'`);
            //                 addTask(newTask);
            //                 prompt(rl, actions);
            //             });
            //         }
            //     },
            //     'runRound': {
            //         displayedCopy: 'run a round of agent comms',
            //         execute: (rl, actions) => {
            //             agentRunner.runRound();
            //             prompt(rl, actions);
            //         }
            //     },
            //     'exit': {
            //         displayedCopy: 'exit',
            //         execute: (rl, actions) => rl.close()
            //     },
            //     'test': {
            //         displayedCopy: 'test',
            //         execute: (rl, actions) => {
            //             console.warn('test!');
            //             prompt(rl, actions);
            //         }
            //     }
            // };
            //
            // function prompt(rl, actions, promptText = 'Raika: Hi! What would you like to do?') {
            //     const choices = Object.keys(actions).map(action => actions[action].displayedCopy)
            //         .reduce((choiceString, choice, idx) => `${choiceString}${idx + 1}. ${choice}\n`, '');
            //     rl.question(`\n${promptText}\n${choices}`, choiceNum => {
            //         const chosenAction = Object.keys(actions)[parseInt(choiceNum) - 1];
            //         actions[chosenAction].execute(rl, actions);
            //         // if (chosenAction !== 'exit') {
            //             // prompt(rl, actions);
            //         // }
            //     });
            // }
            //
            // prompt(rl, actions);
        });
    }
}

module.exports = Raika;
