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
	callback: (edit: TextEditorEdit, doc: TextDocument, pos: Position) => boolean)
{
	let disposable = commands.registerCommand(command, () => {
		if (window.activeTextEditor) {
			typingOperation(window.activeTextEditor, callback);
		}
	});
	context.subscriptions.push(disposable);
}

function insert(edit: TextEditorEdit, doc: TextDocument, pos: Position)
{
	const identRegEx = /\w/;
	const cLike = languageIsCLike(doc);
	let suggest = false;

	if (!smartDashEnabled(doc) || inVerbatimText(doc, pos)) {
		edit.insert(pos, '-');
	} else if (cLike && charsBehindEqual(doc, pos, '_')) {
		deleteBehind(edit, pos, '_'.length);
		edit.insert(pos, '--');
	} else if (cLike && charsBehindEqual(doc, pos, '--')) {
		deleteBehind(edit, pos, '--'.length);
		edit.insert(pos, '_--');
	} else if (charsBehind(doc, pos, 1).match(identRegEx)) {
		edit.insert(pos, '_');
		suggest = true;
	} else {
		edit.insert(pos, '-');
	}
	return suggest;
}

function insertGt(edit: TextEditorEdit, doc: TextDocument, pos: Position)
{
	if (smartDashEnabled(doc)
		&& languageIsCLike(doc)
		&& !inVerbatimText(doc, pos)
		&& charsBehindEqual(doc, pos, '_'))
	{
		deleteBehind(edit, pos, '_'.length);
		edit.insert(pos, '->');
		return true;
	} else {
		let result = charsBehindEqual(doc, pos, '-');
		edit.insert(pos, '>');
		return result;
	}
}

function insertDash(edit: TextEditorEdit, doc: TextDocument, pos: Position)
{
	edit.insert(pos, '-');
	return false;
}


function smartDashEnabled(doc: TextDocument) {
	return languageIsInConfigParam(doc, "languages");
}

function languageIsCLike(doc: TextDocument) {
	return languageIsInConfigParam(doc, "cLikeLanguages");
}

function languageIsInConfigParam(doc: TextDocument, param: string) {
	let languages: Array<string> | undefined =
		workspace.getConfiguration("smart-dash").get(param);
	return languages?.includes(doc.languageId);
}

function inVerbatimText(doc: TextDocument, pos: Position) {
	const verbatimScopes = ['string', 'comment', 'numeric'];

	let scopes = syntacticScopes(doc, pos);
	let parts = scopes.map(scope => scope.split('.')).flat();
	let verbatim = parts.some(part => verbatimScopes.includes(part));

	return verbatim;
}

function syntacticScopes(doc: TextDocument, pos: Position): string[]
{
	let hscopes = extensions.getExtension('draivin.hscopes')?.exports;
	return hscopes?.getScopeAt(doc, pos)?.scopes || [];
}

async function typingOperation(
	editor: TextEditor,
	callback: (edit: TextEditorEdit, doc: TextDocument, pos: Position) => boolean)
{
	let suggest!: boolean;

	await editor.edit(edit => {
		edit.delete(editor.selection);
		suggest = callback(edit, editor.document, editor.selection.start);
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

function charsBehindEqual(doc: TextDocument,
	pos: Position,
	chars: string): boolean
{
	return charsBehind(doc, pos, chars.length) === chars;
}

function charsBehind(doc: TextDocument, pos: Position, chars: number): string
{
	let stringStart = doc.positionAt(doc.offsetAt(pos) - chars);
	let range = new Range(stringStart, pos);
	return doc.getText(range);
}

function deleteBehind(e: TextEditorEdit, pos: Position, chars: number) {
	let range = new Range(pos.line, pos.character - chars, pos.line, pos.character);
	e.delete(range);
}
