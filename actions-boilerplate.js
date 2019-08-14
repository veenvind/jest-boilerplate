#!/usr/bin/env node

const path = require('path');
const util = require('./util');

function createModuleDescTemplate(file) {
  const funcList = util.parseFunctions(file.data)
    .map(func => createBeforeAfterContent(func))
    .map(func => createAssertion(func))
    .map(func => processFuncObj(func))
    .map(func => util.createFuncDescTemplate(func))
    .map(func => util.indentMultiLine(func));

  let importList = util.parseImports(file.data);
  importList = importList.replace(/import (.*) from 'apps\/ads\/adUtils\/reduxFetch'/, "import * as reduxFetch from 'apps/ads/adUtils/reduxFetch'");
  return `import * as actions from './actions';
${importList}

describe("${file.name}", () => {
${funcList.join('')}
});`
}

function processFuncObj(func) {
  func.callName = `actions.${func.name}`;
  func.itList = [{ name: "should return correctly"}];
  if(func.spy) {
    func.itList[0] = {
      name: `should pass parameters to ${func.spy} correctly`,
      assertionId: 0
    }
  }

  return func;
}

function createBeforeAfterContent(func) {
  if(func.raw.match(/(redux(Post|Get|Put))/)) {
    const api = func.raw.match(/(redux(Post|Get|Put))/)[0];
    func.beforeEach += `${api}Spy = jest.spyOn(reduxFetch, "${api}").mockImplementation(() => {});`;
    func.afterEach += `${api}Spy.mockRestore();`;
    func.spy = `${api}Spy`;
    func.globalVars.push(`let ${api}Spy;\n`);
  }
  return func;
}

function createAssertion(func) {
  if(func.raw.indexOf('=>') > -1) {
    func.assertion = `const dispatchSpy = jest.fn();
${func.callName}(${func.params.join(', ')})(dispatchSpy);
expect(${func.spy}).toBeCalledWith()`;
  } else {
    func.assertion = `expect(${func.callName}(${func.params.join(', ')})).toEqual();`
  }
  return func
}

function createActionTestFile(pathStr) {
  const filePath = path.resolve(pathStr);
  util.readFile(filePath).then(createModuleDescTemplate).then(util.writeTestFile.bind(null, filePath));
}


createActionTestFile(process.argv[2]);
