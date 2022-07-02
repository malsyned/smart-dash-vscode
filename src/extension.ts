import {
	commands,
	extensions,
	window,
	ExtensionContext,
	Position,
	Range,
	TextDocument,
	TextEditor,
	TextEditorEdit,
	TextEditorRevealType,
	workspace,
	CompletionList,
} from 'vscode';

export function activate(context: ExtensionContext) {
	registerTypingCommand(context, 'smart-dash.insert', insert);
	registerTypingCommand(context, 'smart-dash.insertGreaterThan', insertGt);
	registerTypingCommand(context, 'smart-dash.insertDash', insertDash);
}

export function deactivate() { }

function registerTypingCommand(
	context: ExtensionContext,
	command: string,
	callback: (editBuilder: TextEditorEdit, doc: TextDocument, pos: Position) => boolean)
{
	let disposable = commands.registerCommand(command, () => {
		if (window.activeTextEditor) {
			typingOperation(window.activeTextEditor, callback);
		}
	});
	context.subscriptions.push(disposable);
}

function insert(e: TextEditorEdit, document: TextDocument, pos: Position)
{
	const identRegEx = /\w/;
	const cLike = languageIsCLike(document);
	let suggest = false;

	if (!smartDashEnabled(document) || inVerbatimText(document, pos)) {
		e.insert(pos, '-');
	} else if (cLike && charsBehindEqual(document, pos, '_')) {
		deleteBehind(e, pos, '_'.length);
		e.insert(pos, '--');
	} else if (cLike && charsBehindEqual(document, pos, '--')) {
		deleteBehind(e, pos, '--'.length);
		e.insert(pos, '_--');
	} else if (charsBehind(document, pos, 1).match(identRegEx)) {
		e.insert(pos, '_');
		suggest = true;
	} else {
		e.insert(pos, '-');
	}
	return suggest;
}

function insertGt(e: TextEditorEdit, document: TextDocument, pos: Position)
{
	if (smartDashEnabled(document)
		&& languageIsCLike(document)
		&& !inVerbatimText(document, pos)
		&& charsBehindEqual(document, pos, '_'))
	{
		deleteBehind(e, pos, '_'.length);
		e.insert(pos, '->');
		return true;
	} else {
		let result = charsBehindEqual(document, pos, '-');
		e.insert(pos, '>');
		return result;
	}
}

function insertDash(e: TextEditorEdit, document: TextDocument, pos: Position)
{
	e.insert(pos, '-');
	return false;
}


function smartDashEnabled(document: TextDocument) {
	return languageIsInConfigParam(document, "languages");
}

function languageIsCLike(document: TextDocument) {
	return languageIsInConfigParam(document, "cLikeLanguages");
}

function languageIsInConfigParam(document: TextDocument, param: string) {
	let cLikeLanguages: Array<string> | undefined =
		workspace.getConfiguration("smart-dash").get(param);
	return cLikeLanguages?.includes(document.languageId);
}

function inVerbatimText(document: TextDocument, pos: Position) {
	const verbatimScopes = ['string', 'comment', 'numeric'];

	let scopes = syntacticScopes(document, pos);
	let parts = scopes.map(scope => scope.split('.')).flat();
	let verbatim = parts.some(part => verbatimScopes.includes(part));

	return verbatim;
}

function syntacticScopes(document: TextDocument, pos: Position): string[]
{
	let hscopes = extensions.getExtension('draivin.hscopes')?.exports;
	return hscopes?.getScopeAt(document, pos)?.scopes || [];
}

async function typingOperation(
	editor: TextEditor,
	callback: (editBuilder: TextEditorEdit, doc: TextDocument, pos: Position) => boolean)
{
	let suggest!: boolean;

	await editor.edit(e => {
		e.delete(editor.selection);
		suggest = callback(e, editor.document, editor.selection.start);
	}, {undoStopBefore: false, undoStopAfter: false});
	editor.revealRange(editor.selection, TextEditorRevealType.Default);

	if (!suggest) {
		return;
	}
	let completions = await commands.executeCommand<CompletionList>(
		'vscode.executeCompletionItemProvider',
		editor.document.uri, editor.selection.active, undefined, 1);
	if (!completions.items.length) {
		return;
	}

	await commands.executeCommand('editor.action.triggerSuggest');
}

function charsBehindEqual(document: TextDocument,
	pos: Position,
	chars: string): boolean
{
	return charsBehind(document, pos, chars.length) === chars;
}

function charsBehind(document: TextDocument, pos: Position, chars: number): string
{
	let stringStart = document.positionAt(document.offsetAt(pos) - chars);
	let range = new Range(stringStart, pos);
	return document.getText(range);
}

function deleteBehind(e: TextEditorEdit, pos: Position, chars: number) {
	let range = new Range(pos.line, pos.character - chars, pos.line, pos.character);
	e.delete(range);
}
