var ev_scripts;
const argTypes = {
	0: "CmdType",
    1: "Value",
    2: "Work",
    3: "Flag",
    4: "SysFlag",
    5: "String"
}

module.exports = {
	async provideSignatureHelp(document, position, token, context) {
		let line = document.lineAt(position);
		let start = line.text.substring(0, position.character + 1);
		let activeParameter = start.split(/,\s*/).length - 1;

		let matchedevcmd = line.text.match(/(?<!;.*)\b\w+\b(?=\()/g)[0];

		if (matchedevcmd == null) {
			return null
		}

		for (const evCmdCode in ev_scripts) {
			if (Object.hasOwnProperty.call(ev_scripts, evCmdCode)) {
				const evCmd = ev_scripts[evCmdCode];
				if (evCmd.name == matchedevcmd) {
					// evCmd Found
					let parameters = []
					
					evCmd.validArgs.forEach(argument => {
						let parameter = {
							label: `${argument.name}${argument.optional ? '?' : ''}: ${argument.validArgTypes.map(value => argTypes[value]).join(' | ')}`,
							documentation: argument.description
						}
						parameters.push(parameter);
					});

					let activeSignature = context.activeSignatureHelp ? context.activeSignatureHelp.activeSignature : 0

					let signatureHelp = {
						activeParameter: activeParameter,
						activeSignature: activeSignature,
						signatures: [
							{
								activeParameter: activeParameter,
								documentation: evCmd.description,
								label: `${evCmd.name}(${parameters.map(value => value.label).join(', ')})`,
								parameters: parameters
							}
						]
					}

					return signatureHelp;
				}
			}
			// Process Cancellations
			if (token.isCancellationRequested) {
				return
			}
		}

		// Didnt find a valid signature
		return null;
	},
	setEvScripts(evScripts) {
		ev_scripts = evScripts;
	}
}