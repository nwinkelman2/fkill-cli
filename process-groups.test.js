import test from 'ava';
import packageJson from './package.json' with {type: 'json'};
import {collapseDuplicateProcessChoices, resolveProcessSelection} from './process-groups.js';

const renderTestProcess = process_ => ({name: `${process_.name} ${process_.pid}`, value: process_.pid});

test('published package contains the process-group implementation', t => {
	t.true(packageJson.files.includes('process-groups.js'));
});

test('smart mode collapses duplicate process names', t => {
	const choices = collapseDuplicateProcessChoices([
		{name: 'node', pid: 11, ports: []},
		{name: 'node', pid: 22, ports: []},
		{name: 'python', pid: 33, ports: []},
	], renderTestProcess);

	t.is(choices.length, 2);
	t.regex(choices[0].name, /^node \(2 processes/);
	t.is(choices[0].value.type, 'process-group');
	t.deepEqual(choices[0].value.processes.map(process_ => process_.pid), [11, 22]);
	t.is(choices[1].value, 33);
});

test('single-process selection needs no submenu', async t => {
	let promptCalled = false;
	const selection = await resolveProcessSelection(33, renderTestProcess, async () => {
		promptCalled = true;
	});

	t.deepEqual(selection, [33]);
	t.false(promptCalled);
});

test('process group offers an explicit kill-all action', async t => {
	const group = collapseDuplicateProcessChoices([
		{name: 'node', pid: 11, ports: []},
		{name: 'node', pid: 22, ports: []},
	], renderTestProcess)[0].value;
	let actionQuestion;
	let promptCalls = 0;
	const selection = await resolveProcessSelection(group, renderTestProcess, async questions => {
		promptCalls++;
		[actionQuestion] = questions;
		return {action: 'kill-all'};
	});

	t.is(promptCalls, 1);
	t.is(actionQuestion.type, 'list');
	t.deepEqual(actionQuestion.choices.map(choice => choice.value), ['kill-all', 'choose-individual']);
	t.regex(actionQuestion.choices[0].name, /^Kill all 2 node processes$/);
	t.deepEqual(selection, [11, 22]);
});

test('process group can choose an individual subset', async t => {
	const group = collapseDuplicateProcessChoices([
		{name: 'node', pid: 11, ports: []},
		{name: 'node', pid: 22, ports: []},
	], renderTestProcess)[0].value;
	let promptCalls = 0;
	let checkboxQuestion;
	const selection = await resolveProcessSelection(group, renderTestProcess, async questions => {
		promptCalls++;
		const [question] = questions;
		if (promptCalls === 1) {
			return {action: 'choose-individual'};
		}

		checkboxQuestion = question;
		return {processes: [22]};
	});

	t.is(promptCalls, 2);
	t.is(checkboxQuestion.type, 'checkbox');
	t.deepEqual(checkboxQuestion.choices.map(choice => choice.value), [11, 22]);
	t.truthy(checkboxQuestion.validate([22]));
	t.is(checkboxQuestion.validate([]), 'Select at least one process.');
	t.deepEqual(selection, [22]);
});
