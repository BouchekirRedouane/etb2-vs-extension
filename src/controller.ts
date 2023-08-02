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
		
		if (cell.notebook.uri.toString().includes("untitled:")) {
			execution.executionOrder = ++this._executionOrder;
			execution.start(Date.now());
			try {

				const errorText = "Error: Please save the etb2 notebook first to specify the working directory.";
				const formattedErrorText = `<span style="color:#ff0000">Error: </span> ${errorText.substring("Error:".length)}`;
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
				vscode.NotebookCellOutputItem.text(await executeETB2Command(cell.document.getText(), cell.notebook.uri.toString(), abortController))
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





async function executeETB2Command0(
	etb2Command: string,
	workingDirectory: string,
	abortController: AbortController
  ): Promise<string> {
	const pathWithoutFilePrefix = workingDirectory.replace('file:///', '');
	const pathWithoutFinalPart = pathWithoutFilePrefix.replace(/\/[^/]*$/, '');
	// Escape double quotes with backslashes
	const escapedSpecialCar = etb2Command.replace(/"/g, '\\"'); 
	const command = `/bin/bash -i -l -c "cd /${pathWithoutFinalPart} && ${escapedSpecialCar} 2>&1"`;
	
	vscode.window.showInformationMessage('Running ETB2 command:  ' + etb2Command);
  
	return new Promise<string>((resolve, reject) => {
	  const childProcess = cp.spawn(command, [], {
		shell: true,
		stdio: 'pipe',
	  });
  
	  let result = '';

	  // Listen for the 'data' event to capture the output of the child process
	  childProcess.stdout?.on('data', (data) => {
		result += data.toString();
	  });
  
	  // Listen for the 'error' event to handle any errors that occur during child process execution
	  childProcess.on('error', (error) => {
		vscode.window.showInformationMessage('Error occurred:' + error.message);
		reject(error);
	  });
  
	  // Listen for the 'abort' event from the AbortController to manually kill the child process
	  abortController.signal.addEventListener('abort', () => {
		if (childProcess.pid) {
		  process.kill(childProcess.pid, 'SIGABRT');
		  vscode.window.showInformationMessage("kill PID: "+childProcess.pid);
		}
	  });
  
	  // Listen for the 'exit' event to resolve or reject the promise when the child process is done
	  childProcess.on('exit', (code, signal) => {
		if (signal === 'SIGABRT') {
		  reject(new Error('Command execution was aborted.'));
		} else if (code === 0) {
		  resolve(result.trim());
		} else {
		  reject(new Error(`Command execution failed with exit code ${code}.`));
		}
	  });
	});
  }




//Old version of ETB2 command execution 
async function executeETB2Command(
	etb2Command: string,
	workingDirectory: string,
	abortController: AbortController
  ): Promise<string> {

	const pathWithoutFilePrefix = workingDirectory.replace('file:///', '');
	const pathWithoutFinalPart = pathWithoutFilePrefix.replace(/\/[^/]*$/, '');
	const escapedSpecialCar = etb2Command.replace(/"/g, '\\"'); // Escape double quotes with backslashes
	const command = `/bin/bash -i -l -c "cd /${pathWithoutFinalPart} && ${escapedSpecialCar} 2>&1"`;
  
	vscode.window.showInformationMessage('Running ETB2 command: ' + etb2Command);
  
	return new Promise<string>((resolve, reject) => {
	  let result = '';
	  let childProcess: cp.ChildProcess | null = null;
  
	  // Assign the child process to the variable
	  childProcess = cp.spawn(command, [], {
		shell: true,
		stdio: 'pipe',
	  });
  
	  // Listen for the 'data' event to capture the output of the child process
	  childProcess.stdout?.on('data', (data) => {
		result += data.toString();
	  });
  
	  // Listen for the 'error' event to handle any errors that occur during child process execution
	  childProcess.on('error', (error) => {
		vscode.window.showInformationMessage('Error occurred: ' + error.message);
		reject(error);
	  });
  
	  // Listen for the 'exit' event to resolve or reject the promise when the child process is done
	  childProcess.on('exit', (code, signal) => {
		if (signal === 'SIGABRT') {
		  reject(new Error('Command execution was aborted.'));
		} else if (code === 0) {
		  resolve(result.trim());
		} else {
		  reject(new Error(`Command execution failed with exit code ${code}.`));
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
				}
				else
				{
					vscode.window.showInformationMessage('Error: PID undefined ' + pid);
				}
			  });
			}
		  });
		}
	  });
	});
  }
  













  let childProcesses: cp.ChildProcess[] = [];
  

  //In case kill all etb2 run instancies (multiple etb2 node)
  async function executeETB2CommandOld1(
	etb2Command: string,
	workingDirectory: string,
	abortController: AbortController
  ): Promise<string> {
	const pathWithoutFilePrefix = workingDirectory.replace('file:///', '');
	const pathWithoutFinalPart = pathWithoutFilePrefix.replace(/\/[^/]*$/, '');
	const escapedSpecialCar = etb2Command.replace(/"/g, '\\"'); // Escape double quotes with backslashes
	const command = `/bin/bash -i -l -c "cd /${pathWithoutFinalPart} && ${escapedSpecialCar} 2>&1"`;
  
	vscode.window.showInformationMessage('Running ETB2 command: ' + etb2Command);
  
	return new Promise<string>((resolve, reject) => {
	  let result = '';
	  let childProcess: cp.ChildProcess | null = null;
  
	  childProcess = cp.spawn(command, [], {
		shell: true,
		stdio: 'pipe',
	  });
  
	  childProcesses.push(childProcess); // Store the child process in the array
  
	  // Listen for the 'data' event to capture the output of the child process
	  childProcess.stdout?.on('data', (data) => {
		result += data.toString();
	  });
  
	  // Listen for the 'error' event to handle any errors that occur during child process execution
	  childProcess.on('error', (error) => {
		vscode.window.showInformationMessage('Error occurred: ' + error.message);
		reject(error);
	  });
  
	  // Listen for the 'exit' event to resolve or reject the promise when the child process is done
	  childProcess.on('exit', (code, signal) => {
		if (signal === 'SIGABRT') {
		  reject(new Error('Command execution was aborted.'));
		} else if (code === 0) {
		  resolve(result.trim());
		} else {
		  reject(new Error(`Command execution failed with exit code ${code}.`));
		}
	  });
  
	  // Listen for the 'abort' event from the AbortController to manually kill the child process and its descendants
	  abortController.signal.addEventListener('abort', () => {
		// Terminate the process group for each command separately
		const commandPids = new Set<number>();
		if (childProcesses.length > 0) {
		  for (const childProc of childProcesses) {
			if (childProc.pid) {
			  pstree(childProc.pid, (err, children) => {
				if (!err) {
				  const pids = [childProc.pid, ...children.map((child) => child.PID)];
				  pids.forEach((pid) => {
					if (pid !== undefined) {
						process.kill(+pid, 'SIGKILL'); // Use the numeric representation of SIGABRT
						vscode.window.showInformationMessage('Killed PID: ' + pid);
					}
					else
					{
						vscode.window.showInformationMessage('Error: PID undefined ' + pid);
					}
				  });
				}
			  });
			}
		  }
		  commandPids.forEach((pid) => {
			process.kill(pid, 'SIGKILL');
			vscode.window.showInformationMessage('Killed PID: ' + pid);
		  });
		  childProcesses = []; // Clear the array after termination
		}
	  });
	});
  }
  



  




