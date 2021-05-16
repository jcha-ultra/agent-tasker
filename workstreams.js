
const { WeaverBot } = require('./run.js');

function getWorkstreamList() {
    return WeaverBot.weaverList;
}

function getWorkstream(swarms, workstreamName) {
    return swarms.getSwarm('weavers').getSwarmling(workstreamName);
}

class Workstream {
    // sourceList is an array of either workstreams or arrays; filter() and order() are both functions, while weave() applies them to sourceList
    constructor(dictionary = {}, sources = [[]], { filter = () => true, sort = () => 0, weave }) {
        this.dictionary = dictionary;
        this._sources = sources; // sources can be workstreams or arrays, but when they're called, they're converted to arrays
        this.filter = filter;
        this.sort = sort;
        this.weave = weave || ((dictionary, sources, filter, sort) => { // by default, weave() concatentates the sources, then applies the filter followed by the sort
            const concatenatedSources = sources.reduce((accumulator, source) => accumulator.concat(source));
            const filteredSources = concatenatedSources.filter(filter);
            const sortedSources= filteredSources.sort(sort);
            return sortedSources;
        });
    }

    static weavePackages = { // some pre-packaged filter, sort, weave combos to use
        filterByContext: (context) => {
            const filter = taskName => taskName.includes(`${context}:`);
            return { filter };
        },
        firstOfEach: { // weaves together the first of each source workstream; does not specify sorting mechanism
            filter: (sourceValue, idx) => idx === 0,
            weave: (dictionary, sources, filter, sort) => {
                const filteredSources = sources.map(source => source.filter(filter));
                const concatenatedSources = filteredSources.reduce((accumulator, source) => accumulator.concat(source));
                const sortedSources = concatenatedSources.sort(sort);
                return sortedSources;
            }
        }
    }

    get sources() {
        const returnedSources = this._sources.map(source => Array.isArray(source) ? source : source.streamList);
        return returnedSources;
    }

    get streamList() {
        return this.weave(this.dictionary, this.sources, this.filter, this.sort);
    }

    next() {
        return this.streamList[0];
    }
}

// Creates the list of workstreams we use
function createWorkstreamMap(tasks = {}) {
    const slack = new Workstream(tasks, [Object.keys(tasks)], Workstream.weavePackages.filterByContext('slack'));
    const jira = new Workstream(tasks, [Object.keys(tasks)], Workstream.weavePackages.filterByContext('jira'));

    return {
        slack,
        jira
    };
}

module.exports = { getWorkstream, getWorkstreamList };
