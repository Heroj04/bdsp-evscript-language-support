// Import Modules
const vscode = require("vscode");

const commands = require("./commands/evscript.commands.js")
const hovers = require("./hovers/evscript.hovers.js")

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
}

// this method is called when your extension is deactivated
function deactivate() {}

// Export our methods
module.exports = {
	activate,
	deactivate
}
