
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


module.exports = { attachProperties, reorderAgentNames };
