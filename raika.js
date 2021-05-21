const readline = require("readline");
const { createAgentFromFile, AgentRunner, Overmind } = require('./run.js');
const { getWorkstreamList, getWorkstream } = require('./workstreams.js');
const { timeHasPassed } = require('./utils/timestamps.js')


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

            function getTime() {
                return (new Date()).toTimeString().split(' ')[0];
            }

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

            const swarms = new Overmind({ dictionary: () => getHumanAgent().tasks });

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
                        if (!this.actions.exit) { // add 'back to start' option to choice menus
                            this.actions.backToStart = {
                                displayedCopy: 'back to start',
                                perform: () => initialStep
                            };
                        }
                        this.performAction = (choiceNum, data) => {
                            const chosenAction = Object.keys(this.actions)[parseInt(choiceNum) - 1];
                            // data.chosenAction = chosenAction;
                            data.nextStep = this.actions[chosenAction].perform(chosenAction, data);
                            return data;
                        };
                    } else if (this.inputType === 'freeform') {
                        this.performAction = (input, data) => {
                            // data.input = input;
                            if (input === 'c') { // allows user to cancel out of inputs
                                data.nextStep = initialStep;
                            } else {
                                data.nextStep = this.actions.action.perform(input, data);
                            }
                            return data;
                        }
                    }
                }

                get fullPromptText() {
                    if (this.inputType === 'choice') {
                        const choices = Object.keys(this.actions)
                        .map(action => this.actions[action].displayedCopy)
                        .reduce((choiceString, choice, idx) => `${choiceString}${idx + 1}. ${choice}\n`, '');
                        return `\n${this.promptText}\n${choices}\nThe current time is ${getTime()}.\n`;
                    } else {
                        return `\n${this.promptText}\nThe current time is ${getTime()}.\n`
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

            const createChoiceStepActions = (function (choiceList, performFunc) {
                const createdChoices = choiceList.reduce((choicesObj, choice) => {
                    choicesObj[choice] = {
                        displayedCopy: choice,
                        perform: performFunc
                    }
                    return choicesObj;
                }, {});
                return createdChoices;
            }).bind(this);

            const createTaskSelectionStep = (function (tasks, copy = 'Tasks for jcha:') {
                const performFunc = (chosenAction, data) => {
                    const taskChosen = chosenAction;
                    return createTaskActionsStep(taskChosen);
                }
                return new FlowStep(
                    copy,
                    'choice',
                    createChoiceStepActions(tasks, performFunc)
                );
            }).bind(this);

            const createTaskActionsStep = (function (taskChosen) {
                return new FlowStep(
                    `What do you want to do with the task '${taskChosen}'?`,
                    'choice',
                    {
                        done: {
                            displayedCopy: 'mark the task as done',
                            perform: () => {
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
                            perform: (chosenAction, data) => {
                                data.taskChosen = taskChosen;
                                return taskSplitStep;
                            }
                        },
                        dependencies_needed: {
                            displayedCopy: 'add dependency to the task',
                            perform: (chosenAction, data) => {
                                data.taskChosen = taskChosen;
                                const performAddDependency = (chosenDependency, data) => { // Action that occurs after dependency is selected from menu
                                    const humanAgent = getHumanAgent();
                                    const requestId = humanAgent.getRequestIdByTaskName(data.taskChosen);
                                    const dependencies = {};
                                    const dependencyAgentId = humanAgent.getAgentByTaskName(board, chosenDependency);
                                    dependencies[dependencyAgentId] = [chosenDependency];
                                    humanAgent.respondDependency(board, requestId, dependencies);
                                    return initialStep;
                                }
                                return new FlowStep(
                                    `What dependency would you like to add to the task '${data.taskChosen}'?`,
                                    'choice',
                                    createChoiceStepActions(getHumanTasks('jcha'), performAddDependency) // Create choice step from list of human tasks
                                );
                            }
                        }
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
                    getNextTask: {
                        displayedCopy: 'get next task',
                        perform: (chosenAction, data) => {
                            const tasks = getHumanTasks('jcha');
                            const notTriggers = tasks.filter(task => !task.includes('['));
                            const triggers = tasks.filter(task => task.includes('[')).sort().reverse();
                            const lastTask = notTriggers[notTriggers.length - 1];
                            const nextTasks = triggers;
                            // console.log(nextTasks)
                            if (lastTask && !Number.parseInt(lastTask)) {
                                nextTasks.unshift(lastTask);
                            }
                            // console.log(nextTasks)
                            if (timeHasPassed(tasks[0])) {
                                nextTasks.unshift(tasks[0]);
                            }
                            // console.log(nextTasks)
                            return createTaskSelectionStep(nextTasks);
                        }
                    },
                    runRound: {
                        displayedCopy: 'run a round of agent actions',
                        perform: (chosenAction, data) => {
                            swarms.act(); // temporarily run before agents for fewer bugs
                            agentRunner.runRound();
                            console.log('Ran a round of agent actions');
                            return initialStep;
                        }
                    },
                    getHumanTasks: {
                        displayedCopy: 'get tasks for agent jcha',
                        perform: (chosenAction, data) => {
                            const tasks = getHumanTasks('jcha');
                            return createTaskSelectionStep(tasks);
                        }
                    },
                    getWorkstreams: {
                        displayedCopy: 'get workstreams',
                        perform: (chosenAction, data) => {
                            return workstreamSelectionStep;
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

            // Step after selecting to view workstreams
            const workstreamSelectionStep = new FlowStep(
                'Which workstream do you want to select?',
                'choice',
                createChoiceStepActions(getWorkstreamList(), (chosenAction, data) => {
                    const workstreamName = chosenAction;
                    const workstreamTasks = getWorkstream(swarms, workstreamName).streamList;
                    return createTaskSelectionStep(workstreamTasks, `Tasks for workstream '${workstreamName}'`);
                })
            );

            const taskSplitStep = new FlowStep(
                'How do you want to split the task? Separate each subtask by an \'&\' character.',
                'freeform',
                {
                    action: {
                        perform: (splitInput, data) => {
                            const subtasks = splitInput.split(' &');
                            const humanAgent = getHumanAgent();
                            const requestId = humanAgent.getRequestIdByTaskName(data.taskChosen);
                            humanAgent.respondSplit(board, requestId, subtasks);
                            return initialStep;
                        }
                    }
                }
            );
            initialStep.execute();
        });
    }
}

const {MessageBoard} = require('./run.js');
const board = new MessageBoard();
const raika = new Raika(board);
raika.start();
// module.exports = Raika;
