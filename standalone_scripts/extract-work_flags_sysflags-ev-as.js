// use the ev-as files to extract names and put them into a json file
const fs = require('fs')

let escapeRegex = /[-\/\\^$*+?.()|[\]{}]/g
let escapeRegexReplace = '\\$&'

let output = { work: {}, flag: {}, sysFlag: {}, cmd: {} }
let workFileContent = fs.readFileSync('ev_work.py')
let flagFileContent = fs.readFileSync('ev_flag.py')
let sysFlagFileContent = fs.readFileSync('ev_sys_flag.py')
let cmdFileContent = fs.readFileSync('ev_cmd.py')

let work = workFileContent.toString().matchAll(/\w+(?= = (-?\d|auto\(\)))/g)
let flag = flagFileContent.toString().matchAll(/\w+(?= = (-?\d|auto\(\)))/g)
let sysFlag = sysFlagFileContent.toString().matchAll(/\w+(?= = (-?\d|auto\(\)))/g)
let cmd = cmdFileContent.toString().matchAll(/\w+(?= = (-?\d|auto\(\)))/g)

let workRegex = '@\\\\d+|'
let flagRegex = '\\\\#\\\\d+|'
let sysFlagRegex = '\\\\$\\\\d+|'
let cmdRegex = '\\\\b_\\\\w+\\\\b(?=\\\\(.*\\\\))|'

let pre = 0
for (const match of work) {
	workRegex += match[0].replace(escapeRegex, escapeRegexReplace) + '|'
	if (match[1] == 'auto()') {
		pre++
	} else {
		pre = parseInt(match[1])
	}
	output.work[pre] = match[0]
	output.work[match[0]] = pre
}
workRegex = workRegex.substring(0, workRegex.length - 1)

pre = 0
for (const match of flag) {
	flagRegex += match[0].replace(escapeRegex, escapeRegexReplace) + '|'
	if (match[1] == 'auto()') {
		pre++
	} else {
		pre = parseInt(match[1])
	}
	output.flag[pre] = match[0]
	output.flag[match[0]] = pre
}
flagRegex = flagRegex.substring(0, flagRegex.length - 1)

pre = 0
for (const match of sysFlag) {
	sysFlagRegex += match[0].replace(escapeRegex, escapeRegexReplace) + '|'
	if (match[1] == 'auto()') {
		pre++
	} else {
		pre = parseInt(match[1])
	}
	output.sysFlag[pre] = match[0]
	output.sysFlag[match[0]] = pre
}
sysFlagRegex = sysFlagRegex.substring(0, sysFlagRegex.length - 1)

pre = 0
for (const match of cmd) {
	cmdRegex += match[0].replace(escapeRegex, escapeRegexReplace) + '|'
	if (match[1] == 'auto()') {
		pre++
	} else {
		pre = parseInt(match[1])
	}
	output.cmd[pre] = match[0]
	output.cmd[match[0]] = pre
}
cmdRegex = cmdRegex.substring(0, cmdRegex.length - 1)

fs.writeFileSync('enumRegex.txt', `${workRegex}\n${flagRegex}\n${sysFlagRegex}\n${cmdRegex}`)
fs.writeFileSync('enums.json', JSON.stringify(output))