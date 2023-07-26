import * as vscode from 'vscode';
import { SampleKernel } from './controller';
import { SampleContentSerializer } from './serializer';

import * as cp from 'child_process';


const NOTEBOOK_TYPE = 'etb2-notebook';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('etb2-vs-code.etb2', () => {
		if (isETB2Installed()) {
			vscode.window.showInformationMessage('ETB2 is installed!');
		  } else {
			vscode.window.showWarningMessage('ETB2 is not installed. Please install ETB2 to use this extension properly. Please refer to: https://github.com/SRI-CSL/ETB2');
		  }
	});
	context.subscriptions.push(disposable);


	let contr = new SampleKernel(); 
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			NOTEBOOK_TYPE, new SampleContentSerializer(), { transientOutputs: true }
		),
		contr
	);

	context.subscriptions.push(vscode.commands.registerCommand('etb2.createNotebook', async () => {
		const language = 'json';
			const defaultValue = `etb2 -h`;
			const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, defaultValue, language);
			const data = new vscode.NotebookData([cell]);
			data.metadata = {
				custom: {
					cells: [],
					metadata: {
						orig_nbformat: 4
					},
					nbformat: 4,
					nbformat_minor: 2
				}
			};
			const doc = await vscode.workspace.openNotebookDocument(NOTEBOOK_TYPE, data);
			await vscode.window.showNotebookDocument(doc);
	}));


}




function isETB2Installed(): boolean {
	
	try {
	  cp.execSync('bash -i -c "etb2 --version"', { stdio: 'pipe' }).toString().trim();
	  return true;
	} catch (error) {
	  console.log(error);
	  return false;
	}
  }




