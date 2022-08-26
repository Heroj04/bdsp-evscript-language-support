# Change Log

All notable changes to the "bdsp-evscript-language-support" extension will be documented in this file.

## [1.5.1]

- Disable Linting by default until ev_Scripts has been updated

## [1.5]

- EvCmd Signature Help Provider
- Support for Named Flags and Works
  - Hovers Display both
  - Commands available to convert between each
- EvScript Linting Diagnostics Provider
- Better token regex

## [1.4.1]

- Fixed the extension breaking if git or python wasnt installed
- Improved Directory Structure

## [1.4]

- Implement a Hover provider that displays descriptions for EvCmds

## [1.3]

- Command Palette commands for parsing and assembling ev_scripts using ev-as
- Configuration Options to enable message validation during ev-as assembly

### [1.3.1]

- Change Activation back to commands

## [1.2]

- Support Named Work, Flags, SysFlags and Commands

### [1.2.1]

- Fix matching of named values in cases where name was similar to or part of another name

### [1.2.2]

- More Generic Matching of for commands, work and flags. (No Need to explicitly name every possible option)

### [1.2.3]

- Support Auto Indenting after Labels

## [1.1]

- Snippets for all known ev commands

## [1.0]

- Initial release
- Basic Syntax Highlighting
  - Macro Labels
  - Function Commands
  - Command Parameters
    - Flags
    - System Flags
    - Work
    - Numbers
    - Strings
