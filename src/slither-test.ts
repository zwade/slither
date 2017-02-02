import * as commander from "commander";
import * as cp from "mz/child_process";
import * as fs from "mz/fs";

import checkers from "./checkers";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const UP = (n: number) => `\x1b[${n}A`;
const DOWN = (n: number) => `\x1b[${n}B`;

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[39m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const CLEAR = "\x1b[0m";
const SNEK = "🐍  ";

const OK = "✓";
const WRONG_ANSWER = "✗";
const WAITING = "•";
const RUNNING = "•";
const TIME_LIMIT_EXCEEDED = "!";

function parseTests(val: string) {
	let parts = val.split(",");
	let tests = [];

	for (let part of parts) {
		if (part.indexOf("-") >= 0) { // range
			let [aStr, bStr] = part.split("-");
			let [a, b] = [parseInt(aStr), parseInt(bStr)];

			for (let i = a; i <= b; i++) {
				tests.push(i);
			}
		} else { // single number
			tests.push(parseInt(part));
		}
	}

	return tests;
}

let name: string;

commander
	.arguments("<set>")
	.option("-t, --tests [tests]", "Which tests to run", parseTests)
	.action((set: string) => {
		name = set;
	})
	.parse(process.argv);

if (name === undefined) {
	console.error(`${RED}Missing test set name.${CLEAR}`);
} else {
	let configPrm = fs.readFile(".slither/config.json");

	configPrm.catch((err) =>
		console.error(`${RED}No Slither configuration found in the current directory.  Run ${WHITE}${BOLD}slither init${RED} first.${CLEAR}`));

	configPrm.then((data) => {
		let config = JSON.parse(data.toString()) as Config;
		let testset: Testset = config[name];

		if (!testset) {
			console.error(`${RED}No testset with the name "${name}" was found.${CLEAR}`);
		}

		let tests = (commander as any).tests;

		if (Array.isArray(tests)) {
			return Promise.resolve({ testset, tests });
		} else {
			return getAllTests(name).then((tests) => ({ testset, tests }));
		}
	}).then(({ testset, tests }) => {
		let compilePrm = exec(testset.scripts.compile);

		compilePrm.catch(({ stdout, stderr }) => console.error(`${RED}Compile error:${CLEAR} ${stderr}`));

		process.stdout.write(HIDE_CURSOR);

		let prm: Promise<Results> = compilePrm.then(() => ({ results: tests.map((index: number) => ({ index, state: State.WAITING })) }));

		for (let i = 0; i < tests.length; i++) {
			prm.then((results) => {
				results.results[i].state = State.RUNNING;
				update(results);
			});

			prm = prm.then((results) => {
				results.results[i].time = Date.now();
				return test(results, name, testset, tests[i], i);
			});
		}

		prm.then((results) => {
			update(results);
			process.stdout.write(DOWN(results.results.length));
			process.stdout.write(SHOW_CURSOR);
			exec(testset.scripts.cleanup)
		});
	}).catch((err) => { console.error(`${RED}Error:`, err, SHOW_CURSOR, CLEAR); });
}

function exec(cmd: string, input: string = "", timeout: number = 0): Promise<{ stdout: string, stderr: string, timeout?: boolean }> {
	return new Promise((resolve, reject) => {
		let parts = cmd.split(" ");
		let child = cp.spawn(parts[0], parts.slice(1));

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => stdout += data);
		child.stderr.on("data", (data) => stderr += data);

		child.on("error", (err) => {
			reject({ stdout: "", stderr: "" });
		});

		child.stdin.write(input);
		child.stdin.end();

		let timer: NodeJS.Timer;

		if (timeout !== 0) {
			timer = setTimeout(() => {
				child.kill();
				reject({ stdout: "", stderr: "", timeout: true });
			}, timeout);
		}

		child.on("close", (code) => {
			if (timer) {
				clearTimeout(timer);
			}

			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				reject({ stdout, stderr });
			}
		});
	});
}

function getAllTests(name: string) {
	return fs.readdir(`.slither/${name}`)
		.then((files) => {
			let numbers = files.map((file) => parseInt(file.split(".")[0])).sort((a, b) => a - b);

			let tests = [];

			for (let i = 0; i < numbers.length; i++) {
				if (tests[tests.length - 1] !== numbers[i]) {
					tests.push(numbers[i]);
				}
			}
			return tests;
		});
}

function test(results: Results, name: string, testset: Testset, test: number, idx: number): Promise<Results> {
	let inPrm = fs.readFile(`.slither/${name}/${test}.in`);
	let outPrm = fs.readFile(`.slither/${name}/${test}.out`);
	let filePrm = Promise.all([inPrm, outPrm]);

	filePrm.catch((err) =>
		console.error(`${RED}Input or output file missing for test ${test}.${CLEAR}`));

	return filePrm.then(([inBuf, outBuf]) => {
		let input = inBuf.toString();
		let output = outBuf.toString();

		return exec(testset.scripts.run, input, testset.limits.time)
			.then(({ stdout, stderr, timeout }) => {
				results.results[idx].time = Date.now() - results.results[idx].time;
				results.results[idx].memory = 123;

				return checkers[testset.checker.type]({ input, output, check: stdout })
					.then((result) => { results.results[idx].state = State.OK; return results; })
					.catch((err) => { results.results[idx].state = State.WRONG_ANSWER; return results; });
			})
			.catch(({ stdout, stderr, timeout }) => {
				if (timeout) {
					results.results[idx].time = testset.limits.time;
					results.results[idx].memory = 123;
					results.results[idx].state = State.TIME_LIMIT_EXCEEDED;
					return results;
				}

				// if (timeout) {
				// 	return;
				// }

				// console.error(`${RED}Test ${test} exited with non-zero exit code.${CLEAR}`);
				// console.error(`${RED}${err}${CLEAR}`);
			});
	});
}

function update(results: Results) {
	for (let result of results.results) {
		switch (result.state) {
			case State.OK:
				process.stdout.write(GREEN);
				process.stdout.write(OK);
				break;

			case State.WRONG_ANSWER:
				process.stdout.write(RED);
				process.stdout.write(WRONG_ANSWER);
				break;

			case State.WAITING:
				process.stdout.write(GRAY);
				process.stdout.write(WAITING);
				break;

			case State.RUNNING:
				process.stdout.write(CLEAR);
				process.stdout.write(RUNNING);
				break;

			case State.TIME_LIMIT_EXCEEDED:
				process.stdout.write(YELLOW);
				process.stdout.write(TIME_LIMIT_EXCEEDED);
				break;
		}

		process.stdout.write(" ");
		process.stdout.write(CLEAR);
		process.stdout.write(result.index.toString());
		process.stdout.write(" ");

		if (result.state === State.RUNNING) {
			process.stdout.write(GRAY);
			process.stdout.write("[ Running ]");
		} else if (result.state !== State.WAITING) {
			process.stdout.write(GRAY);
			process.stdout.write("[ ");
			process.stdout.write(result.time.toFixed(0));
			process.stdout.write(" ms / ");
			process.stdout.write(result.memory.toFixed(3));
			process.stdout.write(" MB ]");
		}

		process.stdout.write("\n");
	}

	process.stdout.write(CLEAR);
	process.stdout.write(UP(results.results.length));
}

// process.on('unhandledRejection', (reason: string, promise: string) => console.log(reason, promise));
