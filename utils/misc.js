
// attach properties to an existing object without erasing its non-enumerable properties; this changes the first object
function attachProperties(mainObj, propsObj) {
    for (prop of Object.keys(propsObj))  {
        mainObj[prop] = propsObj[prop];
    }
} // test:
// const obj1 = { a: 1, b: 2 };
// const obj2 = { b: 4, c: 3 };
// attachProperties(obj1, obj2);
// console.log(obj1);

function agentCompareFunc(name1, name2) {
    let [name1_nums, name2_nums] = [name1, name2].map(function getAgentNums(name) {
        return name.replace('agent_', '').split('_').map(num => parseInt(num));
    });
    // console.log([name1_nums, name2_nums])

    if ((name1_nums[0] - name2_nums[0]) !== 0) {
        return (name1_nums[0] - name2_nums[0]);
    } else {
        return (name1_nums[1] - name2_nums[1]);
    }
} // test:
// const name1 = 'agent_10_10';
// const name2 = 'agent_100_10'
// console.log(compareFunc(name1, name2)); // expect: < 0
// const name3 = 'agent_10_10'
// console.log(compareFunc(name1, name3)); // expect: 0
// const name4 = 'agent_11_10'
// console.log(compareFunc(name1, name4)); // expect: < 0
// const name5 = 'agent_9_10'
// console.log(compareFunc(name1, name5)); // expect: > 0
// const name6 = 'agent_10_1'
// console.log(compareFunc(name1, name6)); // expect: > 0

// reorder agent names based on seniority
function reorderAgentNames(names) {
    return names.sort(agentCompareFunc)
}
// const names = ['agent_10_10', 'agent_100_10', 'agent_10_10', 'agent_11_10', 'agent_9_10', 'agent_10_1', 'agent_100_9']
// console.log(reorderAgentNames(names)); // expect: ['agent_9_10', 'agent_10_1'. 'agent_10_10', 'agent_10_10', 'agent_11_10', 'agent_100_9', 'agent_100_10']


function requireNoCache(filePath) {
    filePath = filePath.replace('./', `${process.cwd()}/`);
    let _invalidateRequireCacheForFile = function(filePath) {
    	delete require.cache[require.resolve(filePath)];
    };
    _invalidateRequireCacheForFile(filePath);
	return require(filePath);
}

// adaptively uses require depending on whether the expected result was cached or not
function requireAdaptive(filePath) {
    let messageCached = require(filePath.replace('./', `${process.cwd()}/`)); // override default `require` behavior of `./` being relative to file path
    // console.log(Object.keys(messageCached).length);
    if (Object.keys(messageCached).length !== 0) { // If the cached require is nonempty, then return it, otherwise return the no-cache version
        // console.log('branch1')
        return messageCached;
    } else {
        // console.log('branch2')
        return requireNoCache(filePath);
    }
}
// console.log(requireAdaptive('/Users/solarapparition/repos/agents-items/boards/prod/agents/active/agent_3_2.js'));

module.exports = { attachProperties, reorderAgentNames, requireNoCache, requireAdaptive };
