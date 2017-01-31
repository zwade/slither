type Config = { [key: string]: Testset };

interface Testset {
	name: string;
	limits: {
		time: number;
		memory: number;
	};
	io: {
		input: string;
		output: string;
	};
	scripts: {
		compile: string;
		run: string;
		cleanup: string;
	};
	checker: {
		type: string;
		options: any;
	}
}

interface Results {
	results: TestResult[];
}

interface TestResult {
	index: number;
	state: State;
	time?: number;
	memory?: number;
}

declare const enum State {
	WAITING,
	RUNNING,
	OK,
	WRONG_ANSWER,
	TIME_LIMIT_EXCEEDED,
	MEMORY_LIMIT_EXCEEDED
}