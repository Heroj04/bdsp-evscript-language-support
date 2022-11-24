const fs = require("fs");
const path = require("path");

var ev_scripts = JSON.parse(fs.readFileSync("./ev_scripts.json"));
var commands = JSON.parse(fs.readFileSync("./commands.json"));

var argumentTypes = {
	"Command": 0,
	"Number": 1,
	"Var": 2,
	"Flag": 3,
	"System": 4,
	"Label": 5
}

commands.forEach(cmd => {
	let id = String(cmd.Id).padStart(4, '0')
	if (ev_scripts[id] == null) {
		ev_scripts[id] = {validArgs: []}
	}
	ev_scripts[id].name = ev_scripts[id].name ?? cmd.Name;
	ev_scripts[id].description = cmd.Description == '' ? ev_scripts[id].description : cmd.Description;
	ev_scripts[id].validArgs = cmd.Args == 0 ? ev_scripts[id].validArgs : [];
	for (let index = 0; index < cmd.Args.length; index++) {
		const argument = cmd.Args[index];
		ev_scripts[id].validArgs[index] = {
			"description": argument.Description,
            "name": argument.TentativeName,
            "optional": argument.Optional,
            "validArgTypes": argument.Type.map(value => argumentTypes[value])
		}
		ev_scripts[id].validArgs[index].validArgTypes.sort((a, b) => a < b ? -1 : (a > b ? 1 : 0))
	}
});

const allKeys = new Set();
JSON.stringify(ev_scripts, (key, value) => (allKeys.add(key), value));
var string = JSON.stringify(ev_scripts, Array.from(allKeys).sort(), "    ");

fs.writeFileSync("./ev_scripts_new.json", string);