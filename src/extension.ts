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
	registerTextEditorCommand(context, 'smart-dash.insert', insert);
	registerTextEditorCommand(context, 'smart-dash.insertGreaterThan', insertGt);
	registerTextEditorCommand(context, 'smart-dash.insertDash', insertDash);
}

export function deactivate() { }

function registerTextEditorCommand(
	context: ExtensionContext,
	command: string,
	callback: (editor: TextEditor) => void)
{
	let disposable = commands.registerCommand(command, () => {
		if (window.activeTextEditor) {
			callback(window.activeTextEditor);
		}
	});
	context.subscriptions.push(disposable);
}

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
