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
  func.itList = [{
    name: "should return correctly", 
    assertionId: 0,
    params: []
  }];
  if(func.spy) {
    func.itList[0].name = `should pass parameters to ${func.spy} correctly`
  }

  if(func.raw.match(/=>/g) && func.raw.match(/=>/g).length > 1) {
    func.itList.push({
      name: 'should handle success with data',
      assertionId: 1,
      params: ['payload', 'error']
    });
    func.itList.push({
      name: 'should handle failure with data',
      assertionId: 1,
      params: ['payload', 'error']
    });
    func.itList.push({
      name: 'should handle failure',
      assertionId: 2,
      params: []
    });
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
  func.callName = `actions.${func.name}`;
  if(func.raw.indexOf('=>') > -1) {
    func.assertions.push(`const dispatchSpy = jest.fn();
${func.callName}(${func.params.join(', ')})(dispatchSpy);
expect(${func.spy}).toBeCalledWith();`);

    if(func.raw.match(/=>/g).length > 1) {
      func.assertions.push(`const dispatchSpy = jest.fn();
${func.callName}(${func.params.join(', ')})(dispatchSpy);
${func.spy}.mock.calls[0][2](payload, error)();
expect(dispatchSpy.mock.calls[0][0]).toEqual();`);

func.assertions.push(`const dispatchSpy = jest.fn();
${func.callName}(${func.params.join(', ')})(dispatchSpy);
${func.spy}.mock.calls[0][3][1]()();
expect(dispatchSpy.mock.calls[0][0]).toEqual();`);
    }
  } else {
    func.assertions.push(`expect(${func.callName}(${func.params.join(', ')})).toEqual();`);
  }
  return func;
}

function createActionTestFile(pathStr) {
  const filePath = path.resolve(pathStr);
  util.readFile(filePath).then(createModuleDescTemplate).then(util.writeTestFile.bind(null, filePath));
}


createActionTestFile(process.argv[2]);
