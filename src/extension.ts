import {
	commands,
	extensions,
	window,
	ExtensionContext,
	Position,
	Range,
	Selection,
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
			insert(window.activeTextEditor);
		});
		context.subscriptions.push(insertDisposable);

		let insertGtDisposable = commands.registerCommand('smart-dash.insertGreaterThan', () => {
			insertGt(window.activeTextEditor);
		});
		context.subscriptions.push(insertGtDisposable);
	}
}

export function deactivate() { }

function insert(editor: TextEditor | undefined) {
	editor?.edit(e => {
		const cLike = isCLike(editor.document);
		const sel = editor.selection;
		const pos = editor.selection.start;
		const document = editor.document;
		const re = /[a-zA-Z_]/;

		if (!inRegularCode(document, pos)) {
			e.replace(editor.selection, '-');
		} else if (cLike && charsBehind(document, pos, 1) === '_') {
			deleteBehind(e, pos, 1);
			e.replace(editor.selection, '--');
		} else if (cLike && charsBehind(document, pos, 2) === '--') {
			deleteBehind(e, pos, 2);
			e.replace(editor.selection, '_--');
		} else if (charsBehind(document, pos, 1).match(re)) {
			e.replace(editor.selection, '_');
		} else {
			e.replace(editor.selection, '-');
		}
	}).then(() => completeTypingOperation(editor));
}

function isCLike(document: TextDocument) {
	let cLikeLanguages: Array<string> | undefined =
		workspace.getConfiguration("smart-dash").get("cLikeLanguages");
	return cLikeLanguages?.includes(document.languageId);
}

function insertGt(editor: TextEditor | undefined) {
	editor?.edit(e => {
		const pos = editor.selection.start;
		const document = editor.document;
		if (isCLike(editor.document)
			&& inRegularCode(document, pos)
			&& charsBehind(document, pos, 1) === '_') 
		{
			deleteBehind(e, pos, 1);
			e.replace(editor.selection, '->');
		} else {
			e.replace(editor.selection, '>');
		}
	}).then(() => completeTypingOperation(editor));
}

function completeTypingOperation(editor: TextEditor) {
	editor.selection = new Selection(editor.selection.end, editor.selection.end);
	editor.revealRange(editor.selection, TextEditorRevealType.Default);
}

function deleteBehind(e: TextEditorEdit, pos: Position, chars: number) {
	let range = new Range(pos.line, pos.character - chars, pos.line, pos.character);
	e.delete(range);
}

function inRegularCode(document: TextDocument, position: Position) {
	const specialScopes = ['string', 'comment'];

	let tokenScopes = hscopes?.getScopeAt(document, position);
	for (let scope of tokenScopes?.scopes) {
		let genericScope = scope?.split('.')[0];
		if (specialScopes.includes(genericScope)) {
			return false;
		}
	}
	return true;
}

function charsBehind(document: TextDocument,
					 position: Position,
					 chars: number): string 
{
	let stringStart = document.positionAt(document.offsetAt(position) - chars);
	let range = new Range(stringStart, position);
	return document.getText(range);
}
