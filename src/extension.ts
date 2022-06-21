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

let hscopes = extensions.getExtension('draivin.hscopes')?.exports;

export function activate(context: ExtensionContext) {
	if (hscopes) {
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
	}
}

export function deactivate() { }

function insert(editor: TextEditor) {
	const cLike = isCLike(editor.document);
	const document = editor.document;
	const re = /\w/;

	editor.edit(e => {
		const pos = beginTypingOperation(editor, e);

		if (!inRegularCode(document, pos)) {
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
	}).then(() => completeTypingOperation(editor));
}

function isCLike(document: TextDocument) {
	let cLikeLanguages: Array<string> | undefined =
		workspace.getConfiguration("smart-dash").get("cLikeLanguages");
	return cLikeLanguages?.includes(document.languageId);
}

function insertGt(editor: TextEditor) {
	const document = editor.document;
	editor.edit(e => {
		const pos = beginTypingOperation(editor, e);

		if (isCLike(document)
			&& inRegularCode(document, pos)
			&& charsBehindEqual(document, pos, '_'))
		{
			deleteBehind(e, pos, 1);
			e.insert(pos, '->');
		} else {
			e.insert(pos, '>');
		}
	}).then(() => completeTypingOperation(editor));
}

function beginTypingOperation(editor: TextEditor, e: TextEditorEdit) {
	e.delete(editor.selection);
	return editor.selection.start;
}

function completeTypingOperation(editor: TextEditor) {
	editor.revealRange(editor.selection, TextEditorRevealType.Default);
}

function deleteBehind(e: TextEditorEdit, pos: Position, chars: number) {
	let range = new Range(pos.line, pos.character - chars, pos.line, pos.character);
	e.delete(range);
}

function inRegularCode(document: TextDocument, position: Position) {
	const specialScopes = ['string', 'comment'];

	let tokenScopes = hscopes?.getScopeAt(document, position);
	if (tokenScopes) {
		for (let scope of tokenScopes.scopes) {
			let genericScope = scope.split('.')[0];
			if (specialScopes.includes(genericScope)) {
				return false;
			}
		}
	}
	return true;
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
