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

		let insertDashDisposable = commands.registerCommand('smart-dash.insertDash', () => {
			if (window.activeTextEditor) {
				insertDash(window.activeTextEditor);
			}
		});
		context.subscriptions.push(insertDashDisposable);
	}
}

export function deactivate() { }

function insert(editor: TextEditor) {
	const cLike = languageIsCLike(editor.document);
	const document = editor.document;
	const re = /\w/;

	editor.edit(e => {
		const pos = beginTypingOperation(editor, e);

		if (!smartDashEnabled(document) || !inRegularCode(document, pos)) {
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

function insertGt(editor: TextEditor) {
	const document = editor.document;
	editor.edit(e => {
		const pos = beginTypingOperation(editor, e);

		if (smartDashEnabled(document)
			&& languageIsCLike(document)
			&& inRegularCode(document, pos)
			&& charsBehindEqual(document, pos, '_'))
		{
			deleteBehind(e, pos, '_'.length);
			e.insert(pos, '->');
		} else {
			e.insert(pos, '>');
		}
	}).then(() => completeTypingOperation(editor));
}

function insertDash(editor: TextEditor)
{
	editor.edit(e=> {
		const pos = beginTypingOperation(editor, e);
		e.insert(pos, '-');
	}).then(() => completeTypingOperation(editor));
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

function inRegularCode(document: TextDocument, position: Position) {
	const specialScopes = ['string', 'comment'];

	let scopes = hscopes?.getScopeAt(document, position)?.scopes;
	if (!scopes) {
		return true;
	}

	for (let scope of scopes) {
		for (let part of scope.split('.')) {
			if (specialScopes.includes(part)) {
				return false;
			}
		}
	}
	return true;
}

function beginTypingOperation(editor: TextEditor, e: TextEditorEdit) {
	e.delete(editor.selection);
	return editor.selection.start;
}

function completeTypingOperation(editor: TextEditor) {
	editor.revealRange(editor.selection, TextEditorRevealType.Default);
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
