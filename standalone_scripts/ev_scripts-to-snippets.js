// use the ev_scripts.json file made by z80rotom from here https://raw.githubusercontent.com/z80rotom/ev-as/main/ev_scripts.json
const fs = require('fs')

let snippets = {}
let scripts = JSON.parse(fs.readFileSync('ev_scripts.json'))
for (const index in scripts) {
	if (Object.hasOwnProperty.call(scripts, index)) {
		const command = scripts[index];
		let newSnippet = {}
		newSnippet.scope = "evscript"
		newSnippet.description = command.description
		newSnippet.prefix = [command.name, index]
		newSnippet.body = `${command.name}(`
		for (let i = 1; i <= command.validArgs.length; i++) {
			const arg = command.validArgs[i-1];
			newSnippet.body += `\${${i}:${arg.name}${arg.optional ? '?' : ''}}`
			if (i < command.validArgs.length) {
				newSnippet.body += `, `
			}
		}
		newSnippet.body += `)`
		snippets[command.name] = newSnippet
	}
}

fs.writeFileSync('snippets.json', JSON.stringify(snippets))