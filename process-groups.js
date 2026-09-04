const renderProcessGroupForDisplay = processes => ({
	name: `${processes[0].name} (${processes.length} processes — open to choose)`,
	value: {
		type: 'process-group',
		name: processes[0].name,
		processes,
	},
});

const collapseDuplicateProcessChoices = (processes, renderProcess) => {
	const groups = new Map();

	for (const process_ of processes) {
		const group = groups.get(process_.name) ?? [];
		group.push(process_);
		groups.set(process_.name, group);
	}

	return [...groups.values()].map(group => group.length === 1
		? renderProcess(group[0])
		: renderProcessGroupForDisplay(group));
};

const resolveProcessSelection = async (selection, renderProcess, prompt) => {
	if (selection?.type !== 'process-group') {
		return [selection];
	}

	const answer = await prompt([{
		type: 'checkbox',
		name: 'processes',
		message: `Select ${selection.name} processes to kill (press A to toggle all):`,
		choices: selection.processes.map(process_ => renderProcess(process_)),
		validate: processes => processes.length > 0 || 'Select at least one process.',
	}]);

	return answer.processes;
};

export {collapseDuplicateProcessChoices, resolveProcessSelection};
