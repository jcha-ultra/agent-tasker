
// attach properties to an existing object without erasing its non-enumerable properties; this changes the first object
function attachProperties(mainObj, propsObj) {
    for (prop of Object.keys(propsObj))  {
        mainObj[prop] = propsObj[prop];
    }
}

// const obj1 = { a: 1, b: 2 };
// const obj2 = { b: 4, c: 3 };
// attachProperties(obj1, obj2);
// console.log(obj1);

module.exports = { attachProperties };
