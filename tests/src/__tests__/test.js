const puppeteer = require('puppeteer');

const testFile = 'file://' + __dirname + '/../../build/index.html';

async function initialState(page) {
  const editableHtml = await page.$eval("#editableDiv", e => e.innerHTML);
  expect(editableHtml).toBe("");
}

function expectHtml(editComponent, html) {
  return expect(editComponent('getHtml()')).resolves.toBe(html);
}

async function textTyped(page, editComponent) {
  await page.type("#editableDiv", "Hello");
  await expectHtml(editComponent, "Hello");

  await page.type("#editableDiv", ", World!");
  await expectHtml(editComponent, "Hello, World!");
}

async function deleteRewrite(page, editComponent) {
  // See: https://github.com/lovasoa/react-contenteditable/issues/91

  // type "a"
  await page.type("#editableDiv", "a");
  await expectHtml(editComponent, "a");

  // reset the contents programmatically
  await page.evaluate(() => editComponent.setHtml(""));
  await expectHtml(editComponent, "");

  // Re-type "a"
  await page.type("#editableDiv", "a");
  await expectHtml(editComponent, "a");
}

async function resetStyle(page, editComponent) {
  // See: https://github.com/lovasoa/react-contenteditable/issues/81

  // set style
  await editComponent("setProps({ style: { height: '300px' } })");

  // type "a"
  await page.type("#editableDiv", "a");
  await expectHtml(editComponent, "a");

  // set the style to the same value again (shouldn't cause a caret jump)
  await editComponent("setProps({ style: { height: '300px' } })");

  // type "b"
  await page.type("#editableDiv", "b");
  await expectHtml(editComponent, "ab");
}

async function initialOnChange(page, editComponent) {
  // See: https://github.com/lovasoa/react-contenteditable/issues/42

  // Initially, the onChange handler should not have been called a single time
  await expect(editComponent('history.length')).resolves.toBe(0);

  // Focus, the content-editable div
  await page.focus("#editableDiv");

  // The focus should not have triggered a change event
  await expect(editComponent('history.length')).resolves.toBe(0);

  // Blur the editable contents by pressing Tab
  await page.keyboard.press("Tab");

  // The blur should not have triggered a change event
  await expect(editComponent('history.length')).resolves.toBe(0);
}

const testFuns = [
  initialState,
  textTyped,
  deleteRewrite,
  resetStyle,
  initialOnChange
];

describe("react-contenteditable", async () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    browser.close();
  });

  for (let testFun of testFuns) {
    test(testFun.name, async () => {
      await page.goto(testFile);
      await page.waitForSelector('#editableDiv');
      const editComponent = f => page.evaluate('editComponent.' + f);
      await testFun(page, editComponent);
    });
  }
}, 16000);
