import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('all inline scripts have valid syntax', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach(source => new Function(source));
});

test('closed votes use the canonical acceptance rule', () => {
  assert.match(html, /function voteWasAccepted\(idea,v\)/);
  assert.match(html, /voteWasAccepted\(idea,v\)\?'✓ Przyjęto':'✗ Odrzucono'/);
  assert.match(html, /if\(!v\.open\) return voteWasAccepted\(idea,v\)/);
});

test('interactive placeholders do not use dead javascript links', () => {
  assert.doesNotMatch(html, /href=["']javascript:void\(0\)/i);
});

test('team join requests require confirmation and can be withdrawn', () => {
  assert.match(html, /function openGlobalTeamJoinRequest\(teamId\)/);
  assert.match(html, /function confirmWithdrawGlobalTeamRequest\(teamId\)/);
  assert.match(html, /function withdrawGlobalTeamRequest\(teamId\)/);
});

test('add idea still starts the existing private-draft flow', () => {
  assert.match(html, /class="ideas-add-button" onclick="beginNewIdea\(\)"/);
  assert.doesNotMatch(html, /<button[^>]*class="btn-add"[^>]*onclick="beginNewIdea\(\)"/);
  assert.match(html, /ideas-search-row/);
  assert.match(html, /function beginNewIdea\(\)/);
});

test('needed and present competency filters are searchable and filter project cards', () => {
  assert.match(html, /id="idea-needed-skill-search"/);
  assert.match(html, /id="idea-present-skill-search"/);
  assert.match(html, /function renderIdeaSkillFilters\(\)/);
  assert.match(html, /selectedIdeaNeededSkills\.size/);
  assert.match(html, /selectedIdeaPresentSkills\.size/);
  assert.match(html, /ideaHasCompetency\(i,skill,'needed'\)/);
  assert.match(html, /ideaHasCompetency\(i,skill,'present'\)/);
});

test('personalized ideas use the Dla mnie label', () => {
  assert.match(html, /id="tab-for-me"[^>]*>✦ Dla mnie/);
  assert.doesNotMatch(html, /Dopasowane/);
});
