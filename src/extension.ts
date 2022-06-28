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
} from 'vscode';

export function activate(context: ExtensionContext) {
	let insertDisposable = commands.registerCommand('smart-dash.insert', () => {
		if (window.activeTextEditor) {
			insert(window.activeTextEditor);
		}
	});
	context.subscriptions.push(insertDisposable);

	let insertGtDisposable = commands.registerCommand('smart-dash.insertGreaterThan', () => {
		if (window.activeTextEditor) {
			insertGt(window.activeTextEditor);
		}
	});
	context.subscriptions.push(insertGtDisposable);

	let insertDashDisposable = commands.registerCommand('smart-dash.insertDash', () => {
		if (window.activeTextEditor) {
			insertDash(window.activeTextEditor);
		}
	});
	context.subscriptions.push(insertDashDisposable);
}

export function deactivate() { }

function insert(editor: TextEditor) {
	const cLike = languageIsCLike(editor.document);
	const re = /\w/;

	typingOperation(editor, (e, document, pos) => {
		if (!smartDashEnabled(document) || inVerbatimText(document, pos)) {
			e.insert(pos, '-');
		} else if (cLike && charsBehindEqual(document, pos, '_')) {
			deleteBehind(e, pos, '_'.length);
			e.insert(pos, '--');
		} else if (cLike && charsBehindEqual(document, pos, '--')) {
			deleteBehind(e, pos, '--'.length);
			e.insert(pos, '_--');
		} else if (charsBehind(document, pos, 1).match(re)) {
			e.insert(pos, '_');
		} else {
			e.insert(pos, '-');
		}
	});
}

function insertGt(editor: TextEditor) {
	typingOperation(editor, (e, document, pos) => {
		if (smartDashEnabled(document)
			&& languageIsCLike(document)
			&& !inVerbatimText(document, pos)
			&& charsBehindEqual(document, pos, '_'))
		{
			deleteBehind(e, pos, '_'.length);
			e.insert(pos, '->');
		} else {
			e.insert(pos, '>');
		}
	});
}

function insertDash(editor: TextEditor)
{
	typingOperation(editor, (e, document, pos) => {
		e.insert(pos, '-');
	});
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

function inVerbatimText(document: TextDocument, position: Position) {
	const verbatimScopes = ['string', 'comment', 'numeric'];

	let scopes = syntacticScopes(document, position);
	let parts = scopes.map(scope => scope.split('.')).flat();
	let verbatim = parts.some(part => verbatimScopes.includes(part));

	return verbatim;
}

function syntacticScopes(document: TextDocument, position: Position): string[]
{
	let hscopes = extensions.getExtension('draivin.hscopes')?.exports;
	return hscopes?.getScopeAt(document, position)?.scopes || [];
}

function typingOperation(
	editor: TextEditor,
	callback: (editBuilder: TextEditorEdit, doc: TextDocument, pos: Position) => void)
{
	editor.edit(e => {
		e.delete(editor.selection);
		callback(e, editor.document, editor.selection.start);
	}).then(() => editor.revealRange(editor.selection, TextEditorRevealType.Default));
}

function charsBehindEqual(document: TextDocument,
	pos: Position,
	chars: string): boolean
{
	return charsBehind(document, pos, chars.length) === chars;
}

function charsBehind(document: TextDocument,
					 position: Position,
					 chars: number): string
{
	let stringStart = document.positionAt(document.offsetAt(position) - chars);
	let range = new Range(stringStart, position);
	return document.getText(range);
}

function deleteBehind(e: TextEditorEdit, pos: Position, chars: number) {
	let range = new Range(pos.line, pos.character - chars, pos.line, pos.character);
	e.delete(range);
}
