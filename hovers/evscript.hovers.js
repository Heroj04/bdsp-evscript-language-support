const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

var ev_scripts;
const enums = JSON.parse(fs.readFileSync(path.join(__dirname, "../enums.json")))
const argTypes = {
	0: "CmdType",
    1: "Value",
    2: "Work",
    3: "Flag",
    4: "SysFlag",
    5: "String"
}

module.exports = {
	provideHover(document, position, token) {
		// Check Config for Hover Enable
		if (!vscode.workspace.getConfiguration("evscript.hovers").get("enableHovers")) {
			return
		}

		// Get the word at current position
		let range = document.getWordRangeAtPosition(position);
		if (range == null) {return null};
		let word = document.getText(range);

		// Check for label
		if (/^(\w|\\)+:$/.test(document.lineAt(position).text)) {
			// Is Label
			return new vscode.Hover(`\`\`\`evscript\n(Label) ${word}:\n\`\`\``)
		}

		// Check for parameter
		if (range.start.character > 0) {
			let parameter = document.getText(new vscode.Range(range.start.line, range.start.character - 1, range.end.line, range.end.character))
			if (/^@\w+$/.test(parameter)) {
				// Is Work
				return new vscode.Hover(`\`\`\`evscript\n(Work) @${enums.work[parameter.substring(1)]} - ${parameter}\n\`\`\``)
			} else if (/^\#\w+$/.test(parameter)) {
				// Is Flag
				return new vscode.Hover(`\`\`\`evscript\n(Flag) #${enums.flag[parameter.substring(1)]} - ${parameter}\n\`\`\``)
			} else if (/^\$\w+$/.test(parameter)) {
				// Is SysFlag
				return new vscode.Hover(`\`\`\`evscript\n(SysFlag) $${enums.sysFlag[parameter.substring(1)]} - ${parameter}\n\`\`\``)
			}
		}
		

		// Check for evCmd
		for (const evCmdCode in ev_scripts) {
			if (Object.hasOwnProperty.call(ev_scripts, evCmdCode)) {
				const evCmd = ev_scripts[evCmdCode];
				if (evCmd.name == word) {
					// evCmd Found
					// Create the method layout
					let mainLine = `\`\`\`evscript\n(EvCmd) ${evCmd.name}(`
					let descLine = `${evCmd.description}\n\n`
					evCmd.validArgs.forEach(arg => {
						// For each possible argument
						mainLine += arg.name
						mainLine += arg.optional ? "?: " : ": "
						arg.validArgTypes.forEach(argType => {
							// For each arument type an argument can be
							mainLine += argTypes[argType] + " | "
						});
						mainLine = mainLine.substring(0, mainLine.length - 3)
						mainLine += ", "
						descLine += `@param \`${arg.name}\` - ${arg.description}  \n\n`
					});
					mainLine = evCmd.validArgs.length > 0 ? mainLine.substring(0, mainLine.length - 2) : mainLine
					mainLine += ")\n\`\`\`"
					return new vscode.Hover([mainLine, descLine])
				}
			}
			// Process Cancellations
			if (token.isCancellationRequested) {
				return
			}
		}

		// Return nothing found
		return
	},
	setEvScripts(evScripts) {
		ev_scripts = evScripts;
	}
}