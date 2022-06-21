import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	
	let disposable = vscode.commands.registerCommand('smart-dash.insert', () => {
		insert(vscode.window.activeTextEditor);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

function insert(editor: vscode.TextEditor | undefined) {
	editor?.edit(e => {
		let c = '-';
		vscode.commands.executeCommand('vscode.provideDocumentRangeSemanticTokens', editor.document.uri, editor.selection).then(tokens => {
			console.log(tokens);
		});
		const prevChar = charsBehind(editor.document, editor.selection.start, 1);
		if (prevChar.match(/[a-zA-Z_-]/)) {
			c = '_';
		}
		e.replace(editor.selection, c);
	}).then(() => {
		editor.selection = new vscode.Selection(editor.selection.end, editor.selection.end);
	});
}

function charsBehind(document: vscode.TextDocument, 
	                 position: vscode.Position, 
					 chars: number): string 
{
	let stringStart = document.positionAt(document.offsetAt(position) - chars);
	let range = new vscode.Range(stringStart, position);
	return document.getText(range);
}
/*
  (let ((ident-re (if smart-dash-c-mode
                      "[A-Za-z0-9]"
                    "[A-Za-z0-9_]")))
    (if (and (funcall regcodepf)
             (not (funcall bobpf)))
        (cond ((string-match ident-re (string (funcall char-before-f)))
               (funcall insertf ?_))
              ((and smart-dash-c-mode
                    (eql ?_ (funcall char-before-f)))
               (funcall deletef 1)
               (funcall insertf "--"))
              ((and smart-dash-c-mode
                    (eql ?- (funcall char-before-f))
                    (eql ?- (funcall char-before-f -1)))
               (funcall deletef 2)
               (funcall insertf "_--"))
              (t (funcall insertf ?-)))
      (funcall insertf ?-))))
*/