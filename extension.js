// Import Modules
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const commands = require("./commands/evscript.commands.js")
const hovers = require("./hovers/evscript.hovers.js")
const signatureHelp = require("./signaturehelps/evscript.signaturehelp.js")
const diagnostics = require("./diagnostics/evscript.diagnostics.js")

let diagnosticCollection = vscode.languages.createDiagnosticCollection("evscript");

const ev_scripts = JSON.parse(fs.readFileSync(path.join(__dirname, "./ev_scripts.json")));
updateEvScripts()

/** Method called when extension is first activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Register Commands
	commands.commands.forEach(command => {
		context.subscriptions.push(vscode.commands.registerCommand(command.name, command.function))
	});
	// Register Text Editor Commands
	commands.textEditorCommands.forEach(command => {
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(command.name, command.function))
	});

	// Register Hover Provider Method
	context.subscriptions.push(vscode.languages.registerHoverProvider("evscript", hovers))

	// Register Signature Help Provider Method
	context.subscriptions.push(vscode.languages.registerSignatureHelpProvider("evscript", signatureHelp, "(", ","))

	// Setup Diagnostics
	diagnosticCollection = vscode.languages.createDiagnosticCollection("evscript");
	context.subscriptions.push(diagnosticCollection);

	performDiagnostics()

	// Update Diagnostics on workspace folder change
	vscode.workspace.onDidChangeWorkspaceFolders(async workspaceFoldersChange => {
		// Perform dianostics on added folders
		workspaceFoldersChange.added.forEach(async workspaceFolder => {
			if (!vscode.workspace.getConfiguration("evscript.linter").get("enableLinting")) {return;}
			if (vscode.workspace.getConfiguration("evscript.linter").get("filesToLint") == "Editor") {return;}
			diagnostics.doWorkspaceFolderDiagnostics(workspaceFolder).forEach(async fileDiagnostics => {
				diagnosticCollection.set(fileDiagnostics.uri, fileDiagnostics.diagnostics);
			})
		})

		// Remvoe diagnostics on removed folders
		workspaceFoldersChange.removed.forEach(async workspaceFolder => {
			vscode.workspace.fs.readDirectory(workspaceFolder.uri).then(async data => {
				data.forEach(async tuple => {
					diagnosticCollection.delete(vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, tuple[0])));
				})
			})
		})
	})

	// Update Diagnostics per Document
	vscode.workspace.onDidChangeTextDocument(async documentChange => {
		documentDiagnostics(documentChange.document);
	})
	vscode.workspace.onDidSaveTextDocument(documentDiagnostics);
	vscode.workspace.onDidOpenTextDocument(documentDiagnostics);

	// Clear Deleted Files Diagnostics
	vscode.workspace.onDidDeleteFiles(async fileDeleteEvent => {
		fileDeleteEvent.files.forEach(async file => {
			diagnosticCollection.delete(file);
		});
	});

	// Update with Configuration Changes
	vscode.workspace.onDidChangeConfiguration((changeEvent) => {
		if (changeEvent.affectsConfiguration("evscript.linter")) {
			diagnosticCollection.clear();
			performDiagnostics();
		}
		if (changeEvent.affectsConfiguration("evscript.customEv_ScriptsPath")) {
			updateEvScripts();
		}
	})
}

// this method is called when your extension is deactivated
function deactivate() {}

function updateEvScripts() {
	let path = vscode.workspace.getConfiguration("evscript").get("customEv_ScriptsPath");
	if (path == "") {
		hovers.setEvScripts(ev_scripts);
		signatureHelp.setEvScripts(ev_scripts);
		diagnostics.setEvScripts(ev_scripts);
	} else {
		try {
			let contents = fs.readFileSync(path);
			let newEvScripts = JSON.parse(contents);
			hovers.setEvScripts(newEvScripts);
			signatureHelp.setEvScripts(newEvScripts);
			diagnostics.setEvScripts(newEvScripts);
		} catch (error) {
			vscode.window.showErrorMessage("Failed to use custom ev_scripts file")
			hovers.setEvScripts(ev_scripts);
			signatureHelp.setEvScripts(ev_scripts);
			diagnostics.setEvScripts(ev_scripts);
		}
	}
}

async function documentDiagnostics(document) {
	if (document.languageId != "evscript") {return;}
	if (!vscode.workspace.getConfiguration("evscript.linter").get("enableLinting")) {return;}
	diagnosticCollection.set(document.uri, await diagnostics.doDocumentDiagnostics(document));
}

// Performs initial document diagnostics
function performDiagnostics() {
	vscode.workspace.findFiles("**/*.ev").then(async uris => {
		uris.forEach(async uri => {
			vscode.workspace.fs.readFile(uri).then(async data => {
				if (!vscode.workspace.getConfiguration("evscript.linter").get("enableLinting")) {return;}
				if (vscode.workspace.getConfiguration("evscript.linter").get("filesToLint") == "Editor") {return;}
				diagnosticCollection.set(uri, await diagnostics.doDocumentDiagnostics(data.toString()));
			})
		})
	})
	vscode.workspace.textDocuments.forEach(documentDiagnostics);
}

// Export our methods
module.exports = {
	activate,
	deactivate
}
