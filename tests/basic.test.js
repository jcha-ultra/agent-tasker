var World, world;

beforeAll(() => {
    World = require('../run.js');
});

beforeEach(() => {
    world = new World();
});

afterEach(() => {
    world = {};
});


test('moving causes previous occupied location to be unoccupied', () => {
    world.addNewAgent(0, 0);
    world.agents[0].move(1, 1);
    agentLoc = world.agents[0].getLoc();
    expect(world.isOccupied(agentLoc[0], agentLoc[1])).toBe(true);
    expect(world.isOccupied(1, 1)).toBe(true);
});

test('occupied location is correct when agent moves', () => {
    world.addNewAgent(0, 0);
    world.runRound();
    agentLoc = world.agents[0].getLoc();
    expect(world.isOccupied(agentLoc[0], agentLoc[1])).toBe(true);
});

test('occupied location is correct when agent created', ()  => {
    expect(world.isOccupied(0, 0)).toBe(false);
    world.addNewAgent(0, 0);
    expect(world.isOccupied(0, 0)).toBe(true);
});

test('world is created', () => {
    world.addNewAgent(0,0);
    expect(world.agents.length).toBe(1);
});

test('world is reset', () => {
    world.addNewAgent(0,0);
    expect(world.agents.length).toBe(1);

    world = new World();
    world.addNewAgent(0,0);
    expect(world.agents.length).toBe(1);

});

test('numAgents() count is correct', () => {
    world.addNewAgent(0,0);
    world.addNewAgent(0,0);
    expect(world.numAgents(0,0)).toBe(2);
    world.agents[0].move(1,1);
    expect(world.numAgents(0,0)).toBe(1);
    expect(world.numAgents(1,1)).toBe(1);
});
