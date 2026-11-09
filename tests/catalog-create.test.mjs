import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the global add-idea action opens its private draft with the team module loaded', () => {
  const opened = [];
  const drafts = [];
  const context = vm.createContext({
    ideas: drafts,
    createBlankPrivateIdeaDraft: () => ({ id: 42, isDraft: true }),
    queuePersistence() {},
    renderDraftCount() {},
    openIdea: id => opened.push(id),
    openTeamWorkspaceIdea() {
      assert.fail('A global idea must open through the idea entry point');
    },
    setTimeout() {}
  });
  const source = html.match(/function beginNewIdea\([^\n]+/)[0];
  vm.runInContext(source + ';beginNewIdea();', context);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].isDraft, true);
  assert.deepEqual(opened, [42]);
});

test('the resource creation page has its own reloadable route', () => {
  const constants = html.slice(html.indexOf('const SCREEN_ROUTES='), html.indexOf('const IDEA_TAB_ROUTES='));
  const parser = html.match(/function parseAppRoute\([^]*?\n\}/)[0];
  const context = vm.createContext({ safeRoutePart: decodeURIComponent });
  vm.runInContext(constants + parser, context);
  const result = vm.runInContext("parseAppRoute('#resources/new')", context);
  assert.equal(result.kind, 'screen');
  assert.equal(result.screen, 'resource-new');
});

test('resource creation retains the draft and submits all catalog fields through the full-page form', () => {
  const stored = new Map();
  const opened = [];
  const resources = [];
  const fields = {
    name: 'Aparat',
    brand: 'Model A',
    code: 'FOTO-1',
    typeKey: 'media',
    location: 'Warszawa',
    locationDetail: 'Biuro',
    description: 'Aparat do dokumentowania wydarzeń.',
    quantity: '2',
    condition: 'Dobry',
    power: 'Akumulator',
    accessories: 'Ładowarka',
    features: 'Wideo, Zdjęcia',
    tags: 'multimedia, wspólny'
  };
  const form = {
    elements: Object.entries(fields).map(([name, value]) => ({ name, value, type: 'text' })),
    reportValidity: () => true,
    querySelector: () => null
  };
  const host = { innerHTML: '' };
  let writes = 0;
  const context = vm.createContext({
    currentUserSubject: () => 'owner',
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: key => stored.delete(key)
    },
    document: {
      getElementById: id => id === 'catalog-resource-form' ? form : host
    },
    CATALOG_RESOURCE_CATEGORIES: { media: { label: 'Multimedia' } },
    catalogResources: resources,
    MY_NAME: 'Anna',
    TODAY: '9 lis 2026',
    queuePersistence: () => writes++,
    openCatalogResource: id => opened.push(id),
    go() {},
    toast() {},
    escAttr: value => String(value),
    escHtml: value => String(value),
    catalogResourceIcon: () => ''
  });
  const source = html.slice(html.indexOf('let catalogResourceDraft='), html.indexOf('function resourceHash('));
  vm.runInContext(source, context);
  vm.runInContext('renderCatalogResourceForm();captureCatalogResourceDraft();', context);
  assert.match(host.innerHTML, /<form id="catalog-resource-form"/);
  assert.match(host.innerHTML, /Zdjęcie zasobu/);
  assert.equal(stored.size, 1);
  vm.runInContext('catalogResourceDraft=null;', context);
  assert.equal(vm.runInContext('currentCatalogResourceDraft().name', context), 'Aparat');
  vm.runInContext('saveCatalogResource();', context);
  assert.equal(resources.length, 1);
  assert.equal(resources[0].name, 'Aparat');
  assert.equal(resources[0].description, fields.description);
  assert.equal(resources[0].quantity, '2 / 2 szt.');
  assert.deepEqual(Array.from(resources[0].features), ['Wideo', 'Zdjęcia']);
  assert.equal(resources[0].owner, 'Anna');
  assert.equal(opened[0], resources[0].id);
  assert.equal(writes, 1);
  assert.equal(stored.size, 0);
});
