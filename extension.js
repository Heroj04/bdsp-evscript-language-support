// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const spawn = require("child_process").spawn;
const path = require("path");
const evasPath = path.join(__dirname, "ev-as");
const requirements = path.join(evasPath, "requirements.txt");
const osvar = process.platform;
const evasRepo = "https://github.com/Heroj04/ev-as";
const internalConfigPath = path.join(__dirname, "internalConfig.json")
if (!fs.existsSync(internalConfigPath)) {
	fs.writeFileSync(internalConfigPath, "{}")
}
const internalConfig = JSON.parse(fs.readFileSync(internalConfigPath))

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
		vscode.window.showOpenDialog({title: "ev_script File", defaultUri: internalConfig.input_ev_script_uri ? vscode.Uri.file(internalConfig.input_ev_script_uri) : null}).then(input_ev_script_uri => {
			if (input_ev_script_uri) {
				vscode.window.showInformationMessage('Select output folder to place scripts');
				vscode.window.showOpenDialog({canSelectFiles: false, canSelectFolders: true, title: "Scripts Output Folder", defaultUri: internalConfig.output_scripts_uri ? vscode.Uri.file(internalConfig.output_scripts_uri) : null}).then(output_scripts_uri => {
					if (output_scripts_uri) {
						vscode.window.showInformationMessage('Parsing ...');
						internalConfig.input_ev_script_uri = input_ev_script_uri[0].fsPath
						internalConfig.output_scripts_uri = output_scripts_uri[0].fsPath
						fs.writeFileSync(internalConfigPath, JSON.stringify(internalConfig))
						let errorString = ""
						let infoString = ""
						let parser
						if (osvar == "win32") {
							parser = spawn("python", [path.join(evasPath, "src/ev_parse.py"), "-i", input_ev_script_uri[0].fsPath, "-o", output_scripts_uri[0].fsPath]);
						} else {
							parser = spawn("python3", [path.join(evasPath, "src/ev_parse.py"), "-i", input_ev_script_uri[0].fsPath, "-o", output_scripts_uri[0].fsPath]);
						}
						parser.stdout.on("data", data => {
							infoString += data.toString() + "\n"
						})
						parser.stderr.on("data", data => {
							errorString += data.toString() + "\n"
						})
						parser.on("close", code => {
							if (code == 0) {
								vscode.window.showInformationMessage(`Completed Parsing ${input_ev_script_uri[0].fsPath}`);
							} else {
								vscode.window.showErrorMessage("Error Parsing ev_script File");
							}
							if (infoString != "") {
								vscode.window.showInformationMessage(infoString);
							}
							if (errorString != "") {
								vscode.window.showErrorMessage(errorString);
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
		vscode.window.showOpenDialog({title: "Script File", defaultUri: internalConfig.input_ev_uri ? vscode.Uri.file(internalConfig.input_ev_uri) : null}).then(input_ev_uri => {
			if (input_ev_uri) {
				vscode.window.showInformationMessage('Select output ev_script file');
				vscode.window.showOpenDialog({title: "Output ev_script File", defaultUri: internalConfig.output_ev_script_uri ? vscode.Uri.file(internalConfig.output_ev_script_uri) : null}).then(output_ev_script_uri => {
					if (output_ev_script_uri) {
						vscode.window.showInputBox({value: input_ev_uri[0].fsPath.match(/\b(?<!\.)(\w| )+(?=$|\.)/)[0], prompt: "Assembled Script Name"}).then(input_script_name => {
							if (input_script_name) {
								vscode.window.showInformationMessage('Assembling ...');
								internalConfig.input_ev_uri = input_ev_uri[0].fsPath
								internalConfig.output_ev_script_uri = output_ev_script_uri[0].fsPath
								fs.writeFileSync(internalConfigPath, JSON.stringify(internalConfig))
								// Get message validation config
								let config = vscode.workspace.getConfiguration('evscript')
								let messageArgs
								if (config.get("enableMessageValidation")) {
									if (config.get("messageExportsFolder") != "") {
										messageArgs = ["-v", "-m", config.get("messageExportsFolder")]
									} else {
										messageArgs = ["-v"]
									}
								} else {
									messageArgs = ["-nv"]
								}
								let errorString = ""
								let infoString = ""
								let parser
								if (osvar == "win32") {
									parser = spawn("python", [path.join(evasPath, "src/ev_as.py"), "-i", input_ev_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath, "-s", input_script_name].concat(messageArgs));
								} else {
									parser = spawn("python3", [path.join(evasPath, "src/ev_as.py"), "-i", input_ev_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath, "-s", input_script_name].concat(messageArgs));
								}
								parser.stdout.on("data", data => {
									infoString += data.toString() + "\n"
								})
								parser.stderr.on("data", data => {
									errorString += data.toString() + "\n"
								})
								parser.on("close", code => {
									if (code == 0) {
										vscode.window.showInformationMessage(`Completed Assembling Script`);
									} else {
										vscode.window.showErrorMessage("Error Assembling Script");
									}
									if (infoString != "") {
										vscode.window.showInformationMessage(infoString);
									}
									if (errorString != "") {
										vscode.window.showErrorMessage(errorString);
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
		vscode.window.showOpenDialog({canSelectFiles: false, canSelectFolders: true, title: "Scripts Directory", defaultUri: internalConfig.input_scripts_uri ? vscode.Uri.file(internalConfig.input_scripts_uri) : null}).then(input_scripts_uri => {
			vscode.window.showInformationMessage('Select output ev_script file');
			vscode.window.showOpenDialog({title: "Output ev_script File", defaultUri: internalConfig.output_ev_script_uri ? vscode.Uri.file(internalConfig.output_ev_script_uri) : null}).then(output_ev_script_uri => {
				vscode.window.showInformationMessage('Assembling ...');
				internalConfig.input_scripts_uri = input_scripts_uri[0].fsPath
				internalConfig.output_ev_script_uri = output_ev_script_uri[0].fsPath
				fs.writeFileSync(internalConfigPath, JSON.stringify(internalConfig))
				// Get message validation config
				let config = vscode.workspace.getConfiguration('evscript')
				let messageArgs
				if (config.get("enableMessageValidation")) {
					if (config.get("messageExportsFolder") != "") {
						messageArgs = ["-v", "-m", config.get("messageExportsFolder")]
					} else {
						messageArgs = ["-v"]
					}
				} else {
					messageArgs = ["-nv"]
				}
				let errorString = ""
				let infoString = ""
				let parser
				if (osvar == "win32") {
					parser = spawn("python", [path.join(evasPath, "src/ev_as.py"), "-i", input_scripts_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath].concat(messageArgs));
				} else {
					parser = spawn("python3", [path.join(evasPath, "src/ev_as.py"), "-i", input_scripts_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath].concat(messageArgs));
				}
				parser.stdout.on("data", data => {
					infoString += data.toString() + "\n"
				})
				parser.stderr.on("data", data => {
					errorString += data.toString() + "\n"
				})
				parser.on("close", code => {
					if (code == 0) {
						vscode.window.showInformationMessage(`Completed Assembling ev_script File`);
					} else {
						vscode.window.showErrorMessage("Error Assembling ev_script File");
					}
					if (infoString != "") {
						vscode.window.showInformationMessage(infoString);
					}
					if (errorString != "") {
						vscode.window.showErrorMessage(errorString);
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
