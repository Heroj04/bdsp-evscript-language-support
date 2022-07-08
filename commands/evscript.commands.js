const vscode = require("vscode");
const fs = require("fs");
const spawn = require("child_process").spawn;
const path = require("path");
const internalConfigPath = path.join(__dirname, "../internalConfig.json")
const internalConfig = fs.existsSync(internalConfigPath) ? JSON.parse(fs.readFileSync(internalConfigPath)) : {}
const evasPath = path.join(__dirname, "../ev-as");
const evasRepo = "https://github.com/Heroj04/ev-as";
const requirements = path.join(evasPath, "requirements.txt");
const osvar = process.platform;
const enums = JSON.parse(fs.readFileSync(path.join(__dirname, "../enums.json")))

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

async function Parse() {
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
}

async function Assemble() {
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
}

async function AssembleAll() {
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
}

function AllToNamed(editor, edit) {
	let lines = editor.document.getText().split(/\r?\n/g);
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const line = lines[lineNumber];
		let work = line.matchAll(/(?<!;.*)\@(\d+)/g);
		let flags = line.matchAll(/(?<!;.*)\#(\d+)/g);
		let sysFlags = line.matchAll(/(?<!;.*)\$(\d+)/g);

		for (const match of work) {
			let range = new vscode.Range(lineNumber, match.index+1, lineNumber, match.index + match[1].length + 1);
			edit.replace(range, enums.work[parseInt(match[1])]);
		}
		for (const match of flags) {
			let range = new vscode.Range(lineNumber, match.index+1, lineNumber, match.index + match[1].length + 1);
			edit.replace(range, enums.flag[parseInt(match[1])]);
		}
		for (const match of sysFlags) {
			let range = new vscode.Range(lineNumber, match.index+1, lineNumber, match.index + match[1].length + 1);
			edit.replace(range, enums.sysFlag[parseInt(match[1])]);
		}
	}
}

function AllToIndex(editor, edit) {
	let lines = editor.document.getText().split(/\r?\n/g);
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const line = lines[lineNumber];
		let work = line.matchAll(/(?<!;.*)\@(?!\d+)(\w+)/g);
		let flags = line.matchAll(/(?<!;.*)\#(?!\d+)(\w+)/g);
		let sysFlags = line.matchAll(/(?<!;.*)\$(?!\d+)(\w+)/g);

		for (const match of work) {
			let range = new vscode.Range(lineNumber, match.index+1, lineNumber, match.index + match[1].length + 1);
			edit.replace(range, enums.work[match[1]]);
		}
		for (const match of flags) {
			let range = new vscode.Range(lineNumber, match.index+1, lineNumber, match.index + match[1].length + 1);
			edit.replace(range, enums.flag[match[1]]);
		}
		for (const match of sysFlags) {
			let range = new vscode.Range(lineNumber, match.index+1, lineNumber, match.index + match[1].length + 1);
			edit.replace(range, enums.sysFlag[match[1]]);
		}
	}
}

module.exports = {
	"commands": [
		{
			"name": "evscript.parse",
			"function": Parse
		},
		{
			"name": "evscript.assemble",
			"function": Assemble
		},
		{
			"name": "evscript.assemble.all",
			"function": AssembleAll
		}
	],
	"textEditorCommands": [
		{
			"name": "evscript.convert.all.named",
			"function": AllToNamed
		},
		{
			"name": "evscript.convert.all.index",
			"function": AllToIndex
		}
	]
}
