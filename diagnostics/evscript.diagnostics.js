// This whole thing is pretty badly written I think. Really needs some simplification
const vscode = require("vscode");
const textmate = require("vscode-textmate");
const oniguruma = require("vscode-oniguruma");
const fs = require("fs");
const path = require("path");

const ev_scripts = JSON.parse(fs.readFileSync(path.join(__dirname, "../ev_scripts.json")))
const argTypes = {
	0: "CmdType",
    1: "Value",
    2: "Work",
    3: "Flag",
    4: "SysFlag",
    5: "String"
}

// Load Onigaruma
const wasmBin = fs.readFileSync(path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
    return {
        createOnigScanner(patterns) { return new oniguruma.OnigScanner(patterns); },
        createOnigString(s) { return new oniguruma.OnigString(s); }
    };
});

// Setup TextMate Registry
const registry = new textmate.Registry({
    onigLib: vscodeOnigurumaLib,
    loadGrammar: (scopeName) => {
        if (scopeName === 'source.ev') {
			let data = fs.readFileSync(path.join(__dirname, '../grammars/evscript.tmLanguage.json')).toString();
            return textmate.parseRawGrammar(data, path.join(__dirname, '../evscript.tmLanguage.json'))
        }
        console.log(`Unknown scope name: ${scopeName}`);
        return null;
    }
});

async function doDocumentDiagnostics(document) {
	// Only do linitng if the user has it enabled
	if (!vscode.workspace.getConfiguration("evscript.linter").get("enableLinting")) {
		return
	}

	if (typeof document !== "string") {
		document = document.getText();
	}

	let labels = [];
	let latestCommandString = '';
	let latestCommand = null;
	let latestCommandOpen = false;
	let argumentIndex = -1;
	let lines = document.split(/\r?\n/g);
	let diagnostics = [];
	let grammar = await registry.loadGrammar('source.ev')
	
	let ruleStack = textmate.INITIAL;
	// Tokenize each line
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineTokens = grammar.tokenizeLine(line, ruleStack);

		// For Each Token
		for (let j = 0; j < lineTokens.tokens.length; j++) {
			const previousToken = lineTokens.tokens[j - 1 < 0 ? 0 : j - 1];
			const token = lineTokens.tokens[j];
			const tokenString = line.substring(token.startIndex, token.endIndex).trim();

			// Process Rules
			// Token Not Recognized
			if (token.scopes.length == 1) {
				// Check if token is just whitespace
				if (tokenString == '' || tokenString.match(/^\s+$/)) {
					continue;
				} else {
					let error = `'${tokenString}' is not recognized`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.endIndex), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
			}

			if (token.scopes.includes('entity.name.tag.label.evscript')) {
				// Is a label
				if (labels.includes(tokenString)) {
					// error duplicate label
					let error = `Duplicate label '${tokenString}' found`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.endIndex), error, vscode.DiagnosticSeverity.Error))
					continue;
				} else {
					labels.push(tokenString);
				}
			}
			if (token.scopes.includes('entity.name.function.command.evscript')) {
				// Is a command
				latestCommandString = tokenString;
				// See if we can find it in ev_scripts
				let cmdFound = false;
				for (const evCmdCode in ev_scripts) {
					if (Object.hasOwnProperty.call(ev_scripts, evCmdCode)) {
						const evCmd = ev_scripts[evCmdCode];
						if (evCmd.name == latestCommandString) {
							cmdFound = true;
							latestCommand = evCmd;
							break;
						}
					}
				}
				if (!cmdFound) {
					latestCommand = null;
					let error = `'${tokenString}()' is not a valid evCmd`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.endIndex), error, vscode.DiagnosticSeverity.Warning))
					continue;
				}
			}
			if (token.scopes.includes('punctuation.paren.open')) {
				// Command Arguments Start
				latestCommandOpen = true;
			}
			if (token.scopes.includes('punctuation.paren.close')) {
				// Command Arguments End
				if (latestCommandOpen) {
					latestCommandOpen = false;
				}
				// Count non optional args
				if (latestCommand == null) {
					continue;
				}
				let count = 0;
				for (let index = 0; index < latestCommand.validArgs.length; index++) {
					const argument = latestCommand.validArgs[index];
					count += argument.optional ? 0 : 1;
				}
				if (argumentIndex + 1 < count) {
					let error = `'${latestCommandString}' is missing required parameters`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
			}
			if (token.scopes.includes('comment.evscript')) {
				// Comment
				// Nothing can happen after a comment so if an argument list is open it cant be closed
				if (latestCommandOpen) {
					let error = `'${latestCommandString}(' is not closed, ')' expected`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					latestCommandOpen = false;
					argumentIndex = -1;
					continue;
				}
			}
			if (token.scopes.includes('string.quoted.open.evscript') || token.scopes.includes('variable.parameter.work.evscript') || token.scopes.includes('variable.parameter.flag.evscript') || token.scopes.includes('variable.parameter.sysflag.evscript') || token.scopes.includes('constant.numeric.evscript')) {
				// Argument
				if (!previousToken.scopes.includes('punctuation.argument.seperator') && !previousToken.scopes.includes('punctuation.paren.open')) {
					let error = `',' expected`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
				argumentIndex++;
				if (latestCommand == null) {
					continue;
				}
				let expectedTypesString = latestCommand.validArgs[argumentIndex].validArgTypes.map((value) => argTypes[value]).join(' or ');
				if (argumentIndex >= latestCommand.validArgs.length) {
					let error = `Parameter not expected`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
				if (token.scopes.includes('constant.numeric.evscript') && !latestCommand.validArgs[argumentIndex].validArgTypes.includes(1)) {
					let error = `Expected Paramenter type of '${expectedTypesString}' but got 'Value'`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
				if (token.scopes.includes('variable.parameter.work.evscript') && !latestCommand.validArgs[argumentIndex].validArgTypes.includes(2)) {
					let error = `Expected Paramenter type of '${expectedTypesString}' but got 'Work'`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
				if (token.scopes.includes('variable.parameter.flag.evscript') && !latestCommand.validArgs[argumentIndex].validArgTypes.includes(3)) {
					let error = `Expected Paramenter type of '${expectedTypesString}' but got 'Flag'`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
				if (token.scopes.includes('variable.parameter.sysFlag.evscript') && !latestCommand.validArgs[argumentIndex].validArgTypes.includes(4)) {
					let error = `Expected Paramenter type of '${expectedTypesString}' but got 'SysFlag'`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
				if (token.scopes.includes('string.quoted.open.evscript') && !latestCommand.validArgs[argumentIndex].validArgTypes.includes(5)) {
					let error = `Expected Paramenter type of '${expectedTypesString}' but got 'String'`;
					diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, token.startIndex, i, token.startIndex + 1), error, vscode.DiagnosticSeverity.Error))
					continue;
				}
			}
		}
		// End of Line
		// If an argument list is open it cant be closed
		if (latestCommandOpen) {
			let error = `'${latestCommandString}(' is not closed, ')' expected`;
			diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, line.length, i, line.length + 1), error, vscode.DiagnosticSeverity.Error))
		}

		latestCommandOpen = false;
		argumentIndex = -1;
		ruleStack = lineTokens.ruleStack;
	}
	
	return diagnostics;
}

async function doWorkspaceFolderDiagnostics(workspaceFolder) {
	let diagnostics = [];
	let fileUris = await vscode.workspace.findFiles(path.join(workspaceFolder.uri, "*.ev"));
	for (let index = 0; index < fileUris.length; index++) {
		const uri = fileUris[index];
		let data = await vscode.workspace.fs.readFile(uri)
		diagnostics.push({
			uri,
			diagnostics: doDocumentDiagnostics(data.toString())
		})
	}

	return diagnostics;
}

module.exports = {
	doDocumentDiagnostics,
	doWorkspaceFolderDiagnostics
};