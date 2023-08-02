import * as vscode from 'vscode';
import { SampleKernel } from './controller';
import { SampleContentSerializer } from './serializer';

import { ExtensionContext, StatusBarAlignment, window, StatusBarItem, Selection, workspace, TextEditor, commands } from 'vscode';
import { basename } from 'path';

import * as cp from 'child_process';


const NOTEBOOK_TYPE = 'etb2-notebook';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('etb2-vs-code.etb2', () => {
		if (isETB2Installed()) {
			vscode.window.showInformationMessage('ETB2 is installed!');
		  } else {
			installETB2();
			vscode.window.showWarningMessage('ETB2 is not installed. Please install ETB2 to use this extension properly. Please refer to: https://github.com/SRI-CSL/ETB2');
		}
	});
	context.subscriptions.push(disposable);


	let etb2controller = new SampleKernel(); 
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			NOTEBOOK_TYPE, new SampleContentSerializer(), { transientOutputs: true }
		),
		etb2controller
	);


	context.subscriptions.push(vscode.commands.registerCommand('etb2.createNotebook', async () => {
		const defaultValue = `etb2 -h`;
		const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, defaultValue, 'shellscript');
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
	  //return true;
	  return false;
	} catch (error) {
	  console.log(error);
	  return false;
	}
  }


  function installETB2()
  {
	//Not yet implemeted 
	vscode.window.showOpenDialog({
		canSelectFolders: true,
		canSelectFiles: false,
		canSelectMany: false,
		openLabel: 'Select Folder'
	}).then((folderUri) => {
		if (folderUri && folderUri[0]) {
			// Do something with the selected folder URI
			vscode.window.showInformationMessage(`Selected folder: ${folderUri[0].fsPath}`);
		}
	});
  }
