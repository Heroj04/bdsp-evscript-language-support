// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const spawn = require("child_process").spawn;
const path = require("path");
const evasPath = path.join(__dirname, "ev-as");
const requirements = path.join(evasPath, "requirements.txt");
const osvar = process.platform;
const evasRepo = "https://github.com/Heroj04/ev-as";

spawn("git", ["-C", evasPath, "pull", evasRepo + ".git"]);
spawn("git", ["clone", evasRepo + ".git", evasPath]);

if (osvar == "win32") {
	spawn("python", ["-m", "pip", "install", "-r", requirements]);
} else {
	spawn("python3", ["-m", "pip3", "install", "-r", requirements]);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "bdsp-evscript-language-support" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('evscript.parse', async function () {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Select your ev_script file to be parsed');
		vscode.window.showOpenDialog({title: "ev_script File"}).then(ev_uri => {
			if (ev_uri) {
				vscode.window.showInformationMessage('Select output folder to place scripts');
				vscode.window.showOpenDialog({canSelectFiles: false, canSelectFolders: true, title: "Scripts Output Folder"}).then(scripts_uri => {
					if (scripts_uri) {
						vscode.window.showInformationMessage('Parsing ...');
						let parser
						if (osvar == "win32") {
							parser = spawn("python", [path.join(evasPath, "src/ev_parse.py"), "-i", ev_uri[0].fsPath, "-o", scripts_uri[0].fsPath]);
						} else {
							parser = spawn("python3", [path.join(evasPath, "src/ev_parse.py"), "-i", ev_uri[0].fsPath, "-o", scripts_uri[0].fsPath]);
						}
						parser.stdout.on("data", data => {
							vscode.window.showInformationMessage(data);
						})
						parser.stderr.on("data", data => {
							vscode.window.showErrorMessage(data);
						})
						parser.on("close", code => {
							if (code == 0) {
								vscode.window.showInformationMessage(`Completed Parsing ${ev_uri[0].path}`);
							} else {
								vscode.window.showErrorMessage("Error Parsing ev_script File");
							}
						})
					}
				})
			}
		})
	}));

	context.subscriptions.push(vscode.commands.registerCommand('evscript.assemble', function () {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Select your ev script to be assembled');
		vscode.window.showOpenDialog({title: "Script File"}).then(ev_uri => {
			if (ev_uri) {
				vscode.window.showInformationMessage('Select output ev_script file');
				vscode.window.showOpenDialog({title: "Output ev_script File"}).then(ev_script_uri => {
					if (ev_script_uri) {
						vscode.window.showInputBox({value: ev_uri[0].path.replace(/.+/, ''), prompt: "Assembled Script Name"}).then(script_name => {
							if (script_name) {
								vscode.window.showInformationMessage('Assembling ...');
								let parser
								if (osvar == "win32") {
									parser = spawn("python", [path.join(evasPath, "src/ev_parse.py"), "-i", ev_uri[0].fsPath, "-o", ev_script_uri[0].fsPath, "-s", script_name]);
								} else {
									parser = spawn("python3", [path.join(evasPath, "src/ev_parse.py"), "-i", ev_uri[0].fsPath, "-o", ev_script_uri[0].fsPath, "-s", script_name]);
								}
								parser.stdout.on("data", data => {
									vscode.window.showInformationMessage(data);
								})
								parser.stderr.on("data", data => {
									vscode.window.showErrorMessage(data);
								})
								parser.on("close", code => {
									if (code == 0) {
										vscode.window.showInformationMessage(`Completed Assembling Script`);
									} else {
										vscode.window.showErrorMessage("Error Assembling Script");
									}
								})
							}
						})
					}
				})
			}
		})
	}));

	context.subscriptions.push(vscode.commands.registerCommand('evscript.assemble.all', function () {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Select your scripts directory');
		vscode.window.showOpenDialog({canSelectFiles: false, canSelectFolders: true, title: "Scripts Directory"}).then(scripts_uri => {
			vscode.window.showInformationMessage('Select output ev_script file');
			vscode.window.showOpenDialog({title: "Output ev_script File"}).then(ev_script_uri => {
				vscode.window.showInformationMessage('Assembling ...');
				let parser
				if (osvar == "win32") {
					parser = spawn("python", [path.join(evasPath, "src/ev_parse.py"), "-i", scripts_uri[0].fsPath, "-o", ev_script_uri[0].fsPath]);
				} else {
					parser = spawn("python3", [path.join(evasPath, "src/ev_parse.py"), "-i", scripts_uri[0].fsPath, "-o", ev_script_uri[0].fsPath]);
				}
				parser.stdout.on("data", data => {
					vscode.window.showInformationMessage(data);
				})
				parser.stderr.on("data", data => {
					vscode.window.showErrorMessage(data);
				})
				parser.on("close", code => {
					if (code == 0) {
						vscode.window.showInformationMessage(`Completed Assembling ev_script File`);
					} else {
						vscode.window.showErrorMessage("Error Assembling ev_script File");
					}
				})
			})
		})
	}))
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
