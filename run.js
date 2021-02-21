// Guiding Principles:
// - Little top-down control—agents are semi-independent entities, each making its own decisions
// - Humans are just another type of agents
// - Agents should be as similar to each other as possible in terms of possible actions

// BACKLOG:
// Implement TypeScript
// Orphaned Agents: Neither requests or responses outstanding for it
// Timer Agent
// Implement Priority System (priority = importance * urgency * delay)
// > ---MVP---
// Human-Agent: Post processing request
// Agent Constructor: Import data.methods
// Agent Runner: Save agent data.vars
// Agent Constructor: Import data.vars
// Human-Agent: Request Reader: Translates request json to human readable format
// Human-Agent: Request Reader: Print out how many human requests vs machine requests
// Agent: Act: Read messages from the board
// Agent: Post request
// Create Message Board: Requests and Responses

// Pass 5:
// Agent Runner: Loop through agent files in reverse order

// Pass 4:
// Agent: Spawn dummy agent from file


// class Agent {
//     constructor(world, id, x, y) {
//         this.world = world;
//         this.id = id;
//         this.x = x;
//         this.y = y;
//         this.actions = [];
//         this.sensors = [
//
//         ];
//     }
//
//     static actionPool = [
//         function (agent, str) {   // MoveX
//             agent.move(str,0);
//         },
//         function (agent, str) {   // MoveY
//             agent.move(0,str);
//         }
//     ]
//
//     act() {
//         this.moveRand();
//         this.reproduce();
//         // this.sense();
//         console.log(`${this.id}: ${this.getLoc()}`);
//     }
//
//     getLoc() {
//         return [this.x, this.y];
//     }
//
//     isAtLoc(x, y) {
//         return Boolean(!(this.x - x) && !(this.y - y));
//     }
//
//     move(x, y) {
//         this.world.unsetOccupiedLoc(this.x, this.y)
//         this.x = this.x + x;
//         this.y = this.y + y;
//         this.world.setOccupiedLoc(this.x, this.y);
//     }
//
//     moveRand() {
//         function randMoveAmount() {
//             return Math.floor(Math.random() * 3) - 1;
//         }
//         this.move(randMoveAmount(), randMoveAmount());
//     }
//
//     reproduce() {
//         this.world.addNewAgent(this.x, this.y);
//     }
//
//     // senseSurroundings() {
//     //     this.sensors[0] = this.world.numAgents(this.getLoc()) - 1;
//     //
//     //     // /todo: sense position relative to self
//     //     // for (let i = 0; i < 8; i++) {
//     //     //     this.sensors[i] = this.world.numAgents(this.getLoc());
//     //     // }
//     // }
// }
//
// const rounds = 5;
//
// class World {
//     constructor() {
//         this.agents = [];
//         this.nextID = 0;
//         this.occupiedLocs = {};
//     }
//
//     addNewAgent(x, y) {
//         this.agents.push(new Agent(this, this.nextID, x, y));
//         this.nextID = this.nextID + 1;
//         this.setOccupiedLoc(x, y);
//     }
//
//     isOccupied(x, y) {
//         return Boolean(this.occupiedLocs[x] && this.occupiedLocs[x][y]);
//     }
//
//     numAgents(x, y) {
//         return this.occupiedLocs[x][y];
//     }
//
//     printAgents() {
//         function printAgent(agent) {
//             console.log(`${agent.id}: ${agent.getLoc()}`);
//         }
//         this.agents.forEach(printAgent);
//     }
//
//     runRound(round) {
//         // if (round === 5) {  // TEST
//         //     this.agents[0].reproduce();
//         // }
//         this.agents.forEach(
//             agent => agent.act()
//         );
//     }
//
//     setOccupiedLoc(x, y) {
//         // console.log(`[${x}, ${y}]`)
//         if (!this.occupiedLocs[x]) {     // If x is undefined
//             this.occupiedLocs[x] = {};
//             this.occupiedLocs[x][y] = 0;
//         }
//         this.occupiedLocs[x][y] = this.occupiedLocs[x][y] + 1;
//     }
//
//     unsetOccupiedLoc(x, y) {
//         this.occupiedLocs[x][y] = this.occupiedLocs[x][y] - 1;
//     }
// };
//
// module.exports = World;


// world.addNewAgent(0,0);
//
// [...Array(rounds).keys()].forEach(world.runRound.bind(world));
//
// console.log("---")
//
// world.printAgents();
