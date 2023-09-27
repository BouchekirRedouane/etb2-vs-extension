import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as pstree from 'ps-tree';
import * as fs from 'fs';
import * as path from 'path';

import AbortController from "abort-controller";


export class SampleKernel {
	private readonly _id = 'etb2-notebook-serializer-kernel';
	private readonly _label = 'ETB2 Kernel';
	private readonly _supportedLanguages = [];

	private _executionOrder = 0;
	private readonly _controller: vscode.NotebookController;

	constructor() {
		this._controller = vscode.notebooks.createNotebookController(this._id,
			'etb2-notebook',
			this._label);
		this._controller.supportedLanguages = this._supportedLanguages;
		this._controller.supportsExecutionOrder = true;
		this._controller.executeHandler = this._executeAll.bind(this);
		
	}

	dispose(): void {
		this._controller.dispose();
	}


	private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
		for (const cell of cells) {
			this._doExecution(cell);
		}
	}

	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {

	
		const execution = this._controller.createNotebookCellExecution(cell);
		
		if (cell.notebook.uri.toString().includes("untitled:") &&  !["etb2 -h", "etb2 --help", "etb2 -v", "etb2 --version"].includes(cell.document.getText().toLowerCase().trim()) ) {
			execution.executionOrder = ++this._executionOrder;
			execution.start(Date.now());
			try {

				const errorText = "Error: Please save the etb2 notebook first to specify the working directory.";
				const formattedErrorText = `[<span style="color:#FF0000">ERROR</span>] ${errorText.substring("Error:".length)}`;
				execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(formattedErrorText, 'text/html')
				])]);
				execution.end(true, Date.now());
			} catch (err) {
				execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.error(err as Error)
				])]);
				execution.end(false, Date.now());
			}
		}
		
		else {
			execution.executionOrder = ++this._executionOrder;
			execution.start(Date.now());
			execution.clearOutput();
	  
			try {
			  // Create a separate AbortController for each execution
			  const abortController = new AbortController(); 
			  execution.token.onCancellationRequested(_ => this.abortExecution(abortController)); 
	  
			  execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(await executeETB2Command(cell.document.getText(), cell.notebook.uri.toString(), abortController, execution))
			  ])]);
			  execution.end(true, Date.now());
            } catch (err) {
                execution.replaceOutput([new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error(err as Error)
                ])]);
                execution.end(false, Date.now());
            }
        }
	}

	private abortExecution(abortController: AbortController) {
		if (abortController) {
		  abortController.abort(); // Abort the specific execution's AbortController
		  vscode.window.showInformationMessage("Execution aborted.");
		}
	  }

}


async function executeETB2Command(
	etb2Command: string,
	workingDirectory: string,
	abortController: AbortController,
	execution: vscode.NotebookCellExecution 
  ): Promise<string> {

	const pathWithoutFilePrefix = workingDirectory.replace('file:///', '');
	const pathWithoutFinalPart = pathWithoutFilePrefix.replace(/\/[^/]*$/, '');
	const escapedSpecialCar = etb2Command.replace(/"/g, '\\"'); // Escape double quotes with backslashes

	let command: string;
	if (pathWithoutFinalPart.trim() ==="") {
		command = `/bin/bash -i -l -c "cd /${pathWithoutFinalPart} && ${escapedSpecialCar} 2>&1"`;
	} else {
		command = `/bin/bash -i -l -c "${escapedSpecialCar}"`;
	}



	vscode.window.showInformationMessage('Running ETB2 command: ' + command);
  
	return new Promise<string>((resolve, reject) => {
	  let result = '';
	  let childProcess: cp.ChildProcess | null = null;
  
	  // Assign the child process to the variable
	  childProcess = cp.spawn(command, [], {
		shell: true,
		stdio: 'pipe',
	  });
  
	  childProcess.stdout?.on('data', (data) => {
		const output = data.toString();
		result += output;
  
		// Create a new NotebookCellOutput with the output data and send it to the cell execution
		const outputItems: vscode.NotebookCellOutputItem[] = [
		  vscode.NotebookCellOutputItem.text(result, 'text/plain'),
		];
		const outputOutput = new vscode.NotebookCellOutput(outputItems);
		execution.replaceOutput([outputOutput]);
	  });

  
	  // Listen for the 'error' event to handle any errors that occur during child process execution
	  childProcess.on('error', (error) => {
		vscode.window.showInformationMessage('Error occurred: ' + error.message);
		reject(error);
	  });
  
	  // Listen for the 'exit' event to resolve or reject the promise when the child process is done
	  childProcess.on('exit', (code, signal) => {
		if (signal === 'SIGABRT') {
		  reject(result);
		} else if (code === 0) {
		  resolve(result);
		} else {
		  reject(new Error(result));
		}
	  });
  
	  // Listen for the 'abort' event from the AbortController to manually kill the child process and its descendants
	  abortController.signal.addEventListener('abort', () => {
		if (childProcess && childProcess.pid) {
		  // Terminate the process group (child process and its descendants)
		  pstree(childProcess.pid, (err, children) => {
			if (err) {
			  console.error('Error occurred while terminating process group:', err);
			} else {
			  const pids = [childProcess!.pid, ...children.map((child) => child.PID)];
			  pids.forEach((pid) => {
				if (pid !== undefined) {
				  process.kill(+pid, 'SIGKILL'); // Use the numeric representation of SIGABRT
				  vscode.window.showInformationMessage('Killed PID: ' + pid);
				} else {
				  vscode.window.showInformationMessage('Error: PID undefined ' + pid);
				}
			  });
  
			  // Add the "Server interrupt" message to the result
			  result += '\nETB2 node server interrupted:';
			  // Create a new NotebookCellOutput with the output data and send it to the cell execution
			  const outputItems: vscode.NotebookCellOutputItem[] = [
				vscode.NotebookCellOutputItem.text(result, 'text/plain'),
			  ];
			  const outputOutput = new vscode.NotebookCellOutput(outputItems);
			  execution.replaceOutput([outputOutput]);
			}
		  });
		}
	  });
	});
  }