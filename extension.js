// Import Modules
const vscode = require("vscode");
const fs = require("fs");
const spawn = require("child_process").spawn;
const path = require("path");

// Variables
const evasPath = path.join(__dirname, "ev-as");
const requirements = path.join(evasPath, "requirements.txt");
const osvar = process.platform;
const evasRepo = "https://github.com/Heroj04/ev-as";
const internalConfigPath = path.join(__dirname, "internalConfig.json")
const internalConfig = fs.existsSync(internalConfigPath) ? JSON.parse(fs.readFileSync(internalConfigPath)) : {}
const argTypes = {
	0: "CmdType",
    1: "Value",
    2: "Work",
    3: "Flag",
    4: "SysFlag",
    5: "String"
}

// Get ev-as from Git
try {
	spawn("git", ["-C", evasPath, "pull", evasRepo + ".git"]);
	spawn("git", ["clone", evasRepo + ".git", evasPath]);
} catch (error) {
	vscode.window.showInformationMessage('Git not available, ev-as not usable from command palette.')
}

try {
	// Install python requirements for ev-as
	if (osvar == "win32") {
		spawn("python", ["-m", "pip", "install", "-r", requirements]);
	} else {
		spawn("python3", ["-m", "pip3", "install", "-r", requirements]);
	}
} catch (error) {
	vscode.window.showInformationMessage('Python not available, ev-as not usable from command palette.')
}

// Load ev_scripts.json file from ev-as
ev_scripts_path = path.join(evasPath, "ev_scripts.json")
ev_scripts_path = fs.existsSync(ev_scripts_path) ? ev_scripts_path : path.join(__dirname, "ev_scripts.json")
const ev_scripts = JSON.parse(fs.readFileSync(ev_scripts_path))

/** Method called when extension is first activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Register EvScript Parse Command
	context.subscriptions.push(vscode.commands.registerCommand('evscript.parse', async function () {
		// Open a file dialog to get the ev_script unity file
		vscode.window.showInformationMessage('Select your ev_script file to be parsed');
		vscode.window.showOpenDialog({title: "ev_script File", defaultUri: internalConfig.input_ev_script_uri ? vscode.Uri.file(internalConfig.input_ev_script_uri) : null}).then(input_ev_script_uri => {
			// If the user actually selected a file
			if (input_ev_script_uri) {
				// Open a file dialog to get the output directory folder
				vscode.window.showInformationMessage('Select output folder to place scripts');
				vscode.window.showOpenDialog({canSelectFiles: false, canSelectFolders: true, title: "Scripts Output Folder", defaultUri: internalConfig.output_scripts_uri ? vscode.Uri.file(internalConfig.output_scripts_uri) : null}).then(output_scripts_uri => {
					// If the user actually selected a directory
					if (output_scripts_uri) {
						// Parse the ev scripts
						vscode.window.showInformationMessage('Parsing ...');

						// Save the file dialog info for next time
						internalConfig.input_ev_script_uri = input_ev_script_uri[0].fsPath
						internalConfig.output_scripts_uri = output_scripts_uri[0].fsPath
						fs.writeFileSync(internalConfigPath, JSON.stringify(internalConfig))
						
						// Run the ev_parse.py script with appropriate arguments
						let parser
						if (osvar == "win32") {
							parser = spawn("python", [path.join(evasPath, "src/ev_parse.py"), "-i", input_ev_script_uri[0].fsPath, "-o", output_scripts_uri[0].fsPath]);
						} else {
							parser = spawn("python3", [path.join(evasPath, "src/ev_parse.py"), "-i", input_ev_script_uri[0].fsPath, "-o", output_scripts_uri[0].fsPath]);
						}

						// Setup stdio catching
						let errorString = ""
						let infoString = ""
						parser.stdout.on("data", data => {
							// Information written to console
							infoString += data.toString() + "\n"
						})
						parser.stderr.on("data", data => {
							// Error written to console
							errorString += data.toString() + "\n"
						})
						parser.on("close", code => {
							// Script has finished running and closed
							if (code == 0) {
								vscode.window.showInformationMessage(`Completed Parsing ${input_ev_script_uri[0].fsPath}`);
							} else {
								vscode.window.showErrorMessage("Error Parsing ev_script File");
							}

							// Output any stdio we caught
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

	// Register EvScript Assemble Command
	context.subscriptions.push(vscode.commands.registerCommand('evscript.assemble', function () {
		// Open a file dialog to get the EvScript file to be assembled
		vscode.window.showInformationMessage('Select your ev script to be assembled');
		vscode.window.showOpenDialog({title: "Script File", defaultUri: internalConfig.input_ev_uri ? vscode.Uri.file(internalConfig.input_ev_uri) : null}).then(input_ev_uri => {
			// If the user actually selected a file
			if (input_ev_uri) {
				// Open a file dialog to get the output ev_script unity file
				vscode.window.showInformationMessage('Select output ev_script file');
				vscode.window.showOpenDialog({title: "Output ev_script File", defaultUri: internalConfig.output_ev_script_uri ? vscode.Uri.file(internalConfig.output_ev_script_uri) : null}).then(output_ev_script_uri => {
					// If the user actually selected a file
					if (output_ev_script_uri) {
						// Open an input box to ask for the name of the script, defaults to the filename of the EvScript selected first
						vscode.window.showInputBox({value: input_ev_uri[0].fsPath.match(/\b(?<!\.)(\w| )+(?=$|\.)/)[0], prompt: "Assembled Script Name"}).then(input_script_name => {
							// If the user actually input some text
							if (input_script_name) {
								// Assemble the EvScript
								vscode.window.showInformationMessage('Assembling ...');

								// Save the file dialog info for next time
								internalConfig.input_ev_uri = input_ev_uri[0].fsPath
								internalConfig.output_ev_script_uri = output_ev_script_uri[0].fsPath
								fs.writeFileSync(internalConfigPath, JSON.stringify(internalConfig))

								// Get message validation config
								let config = vscode.workspace.getConfiguration('evscript')
								let messageArgs = config.get("enableMessageValidation") ? config.get("messageExportsFolder") != "" ? ["-v", "-m", config.get("messageExportsFolder")] : messageArgs = ["-v"] : messageArgs = ["-nv"]

								// Run the ev_as.py script with appropriate arguments
								let parser
								if (osvar == "win32") {
									parser = spawn("python", [path.join(evasPath, "src/ev_as.py"), "-i", input_ev_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath, "-s", input_script_name].concat(messageArgs));
								} else {
									parser = spawn("python3", [path.join(evasPath, "src/ev_as.py"), "-i", input_ev_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath, "-s", input_script_name].concat(messageArgs));
								}

								// Setup stdio catching
								let errorString = ""
								let infoString = ""
								parser.stdout.on("data", data => {
									// Information written to console
									infoString += data.toString() + "\n"
								})
								parser.stderr.on("data", data => {
									// Error written to console
									errorString += data.toString() + "\n"
								})
								parser.on("close", code => {
									// Script has finished running and closed
									if (code == 0) {
										vscode.window.showInformationMessage(`Completed Assembling Script`);
									} else {
										vscode.window.showErrorMessage("Error Assembling Script");
									}

									// Output any stdio we caught
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

	// Register EvScript Assemble All Command
	context.subscriptions.push(vscode.commands.registerCommand('evscript.assemble.all', function () {
		// Open a file dialog to get the EvScripts directory folder to be assembled
		vscode.window.showInformationMessage('Select your scripts directory');
		vscode.window.showOpenDialog({canSelectFiles: false, canSelectFolders: true, title: "Scripts Directory", defaultUri: internalConfig.input_scripts_uri ? vscode.Uri.file(internalConfig.input_scripts_uri) : null}).then(input_scripts_uri => {
			// If the user actually selected a file
			if (input_scripts_uri) {
				// Open a file dialog to get the output ev_script unity file
				vscode.window.showInformationMessage('Select output ev_script file');
				vscode.window.showOpenDialog({title: "Output ev_script File", defaultUri: internalConfig.output_ev_script_uri ? vscode.Uri.file(internalConfig.output_ev_script_uri) : null}).then(output_ev_script_uri => {
					// If the user actually selected a file
					if (output_ev_script_uri) {
						// Assemble the EvScripts
						vscode.window.showInformationMessage('Assembling ...');

						// Save the file dialog info for next time
						internalConfig.input_scripts_uri = input_scripts_uri[0].fsPath
						internalConfig.output_ev_script_uri = output_ev_script_uri[0].fsPath
						fs.writeFileSync(internalConfigPath, JSON.stringify(internalConfig))

						// Get message validation config
						let config = vscode.workspace.getConfiguration('evscript')
						let messageArgs = config.get("enableMessageValidation") ? config.get("messageExportsFolder") != "" ? ["-v", "-m", config.get("messageExportsFolder")] : messageArgs = ["-v"] : messageArgs = ["-nv"]
						
						// Run the ev_as.py script with appropriate arguments
						let parser
						if (osvar == "win32") {
							parser = spawn("python", [path.join(evasPath, "src/ev_as.py"), "-i", input_scripts_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath].concat(messageArgs));
						} else {
							parser = spawn("python3", [path.join(evasPath, "src/ev_as.py"), "-i", input_scripts_uri[0].fsPath, "-o", output_ev_script_uri[0].fsPath].concat(messageArgs));
						}
						
						// Setup stdio catching
						let errorString = ""
						let infoString = ""
						parser.stdout.on("data", data => {
							// Information written to console
							infoString += data.toString() + "\n"
						})
						parser.stderr.on("data", data => {
							// Error written to console
							errorString += data.toString() + "\n"
						})
						parser.on("close", code => {
							// Script has finished running and closed
							if (code == 0) {
								vscode.window.showInformationMessage(`Completed Assembling ev_script File`);
							} else {
								vscode.window.showErrorMessage("Error Assembling ev_script File");
							}
							
							// Output any stdio we caught
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
	}))

	// Register Hover Provider Method
	context.subscriptions.push(vscode.languages.registerHoverProvider("evscript", {
		provideHover(document, position, token) {
			// Check Config for Hover Enable
			if (!vscode.workspace.getConfiguration("evscript").get("enableHovers")) {
				return
			}

			// Get the word at current position
			const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);

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
					return new vscode.Hover(`\`\`\`evscript\n(Work) ${parameter}\n\`\`\``)
				} else if (/^\#\w+$/.test(parameter)) {
					// Is Flag
					return new vscode.Hover(`\`\`\`evscript\n(Flag) ${parameter}\n\`\`\``)
				} else if (/^\$\w+$/.test(parameter)) {
					// Is SysFlag
					return new vscode.Hover(`\`\`\`evscript\n(SysFlag) ${parameter}\n\`\`\``)
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
		}
	}))
}

// this method is called when your extension is deactivated
function deactivate() {}

// Export our methods
module.exports = {
	activate,
	deactivate
}
