import {
    commands,
    extensions,
    window,
    ExtensionContext,
    Position,
    Range,
    TextDocument,
    workspace,
    TextEditor,
} from 'vscode';

export function activate(context: ExtensionContext) {
    registerCommand(context, 'smart-dash.insert', insert);
    registerCommand(context, 'smart-dash.insertGreaterThan', insertGt);
}

export function deactivate() { }

function registerCommand(
    context: ExtensionContext,
    command: string,
    callback: (editor: TextEditor, ...args: any[]) => any)
{
    function editorCallback(...args: any[]) {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const doc = editor.document;
        const pos = editor.selection.start;

        return callback(editor, doc, pos, ...args);
    }
    context.subscriptions.push(
        commands.registerCommand(command, editorCallback));
}

async function insert(editor: TextEditor, doc: TextDocument, pos: Position) {
    const identRegEx = /\w/;
    let dashOrUnderscore = '-';

    if (smartDashIsAllowed(doc, pos)) {
        await fixupCLikeAllSelections(editor, doc);
        if (charsBehind(doc, pos, 1).match(identRegEx)) {
            dashOrUnderscore = '_';
        }
    }

    await type(dashOrUnderscore);
}

async function insertGt(editor: TextEditor, doc: TextDocument, pos: Position) {
    if (smartDashIsAllowed(doc, pos)) {
        await fixupCLikeAllSelections(editor, doc);
    }
    await type('>');
}

async function fixupCLikeAllSelections(editor: TextEditor, doc: TextDocument) {
    if (!languageIsCLike(doc)) {
        return;
    }

    for (let selection of editor.selections) {
        await fixupCLike(editor, doc, selection.start);
    }
}

async function fixupCLike(editor: TextEditor, doc: TextDocument, pos: Position) {
    if (charsBehindEqual(doc, pos, '_')) {
        await replaceLeft(editor, pos, '-');
    } else if (charsBehindEqual(doc, pos, '--')) {
        await replaceLeft(editor, pos, '_-');
    }
}

async function type(text: string) {
    await commands.executeCommand('type', { text: text });
}

async function replaceLeft(editor: TextEditor, end: Position, chars: string) {
    const start = end.translate(undefined, -chars.length);
    const range = new Range(start, end);

    await editor.edit(
        editBuilder => editBuilder.replace(range, chars),
        { undoStopBefore: false, undoStopAfter: false });
}

function smartDashIsAllowed(doc: TextDocument, pos: Position): boolean {
    return smartDashEnabled(doc) && !inVerbatimText(doc, pos);
}

function smartDashEnabled(doc: TextDocument) {
    return languageIsInConfigParam(doc, "languages");
}

function languageIsCLike(doc: TextDocument) {
    return languageIsInConfigParam(doc, "cLikeLanguages");
}

function languageIsInConfigParam(doc: TextDocument, param: string) {
    let languages: Array<string> =
        workspace.getConfiguration("smart-dash").get(param) || [];
    return languages.includes(doc.languageId);
}

function inVerbatimText(doc: TextDocument, pos: Position) {
    const verbatimScopes = ['string', 'comment', 'numeric'];

    let scopes = syntacticScopes(doc, pos);
    let parts = scopes.map(scope => scope.split('.')).flat();
    let verbatim = parts.some(part => verbatimScopes.includes(part));

    return verbatim;
}

function syntacticScopes(doc: TextDocument, pos: Position): string[] {
    let hscopes = extensions.getExtension('draivin.hscopes')?.exports;
    return hscopes?.getScopeAt(doc, pos)?.scopes || [];
}

function charsBehindEqual(doc: TextDocument,
    pos: Position,
    chars: string): boolean
{
    return charsBehind(doc, pos, chars.length) === chars;
}

function charsBehind(doc: TextDocument, pos: Position, chars: number): string {
    let stringStart = doc.positionAt(doc.offsetAt(pos) - chars);
    let range = new Range(stringStart, pos);
    return doc.getText(range);
}
