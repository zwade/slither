interface CheckerInput {
	input: string;
	output: string;
	check: string;
}

export default {
	"tokens": ({ input, output, check }: CheckerInput) => {
		let outTokens = output.split(/\s*/g);
		outTokens.filter((tok) => tok !== "");

		let checkTokens = check.split(/\s*/g);
		checkTokens.filter((tok) => tok !== "");

		if (outTokens.length !== checkTokens.length) {
			return Promise.reject(`Incorrect number of tokens: expected ${outTokens.length}, received ${checkTokens.length}.`);
		}

		for (let i = 0; i < outTokens.length; i++) {
			if (checkTokens[i] !== outTokens[i]) {
				return Promise.reject(`Token mismatch at token ${i+1}: expected ${outTokens[i]}, received ${checkTokens[i]}.`);
			}
		}

		return Promise.resolve("Ok");
	}
} as { [key: string]: (inp: CheckerInput) => Promise<string> };