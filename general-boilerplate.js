const gentest = require("./gentest");

function generateAssertions() {
    return [];
}

function generateItList(func) {
    return [];
}
  
gentest.generateTestFile(process.argv[2], generateItList, generateAssertions());