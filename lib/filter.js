function example() {
    return 0;
}

const contexts = [
    'slack',
    'jira'
];

const contextFilters = contexts.reduce((filters, context) => {
    filters[context] = taskName => taskName.includes(`${context}:`);
    return filters;
}, {});

module.exports = { example, ...contextFilters };
