interface CheckerInput {
	input: string;
	expected: string;
	actual: string;
}

interface CheckerOutput {
	ok: boolean;
	display: {
		expected: string;
		actual: string;
	};
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const WHITE = "\x1b[39m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const CLEAR = "\x1b[0m";

const DEBUG_LINE_DELIM = "#";

function leftPad(str: string, length: number) {
	while (str.length < length) {
		str = " " + str;
	}
	return str;
}

export default {
	"lines": ({ input, expected, actual }) => {
		let expectedLines = expected.split(/\n/g);
		let actualLines = actual.split(/\n/g);

		while (expectedLines[expectedLines.length - 1] == "") {
			expectedLines.pop();
		}

		while (actualLines[actualLines.length - 1] == "") {
			actualLines.pop();
		}

		let displayExpected = "";
		let displayActual = "";

		let padLength = Math.max(expectedLines.length.toString().length, actualLines.length.toString().length);

		let i = 0;
		let j = 0;

		let ok = true;

		while (i < expectedLines.length && j < actualLines.length) {
			if (actualLines[j].charAt(0) === DEBUG_LINE_DELIM) {
				displayExpected += "\n";
				displayActual += `${GRAY}${leftPad(`${j+1}`, padLength)} ${actualLines[j]}${CLEAR}\n`;
				j++;
				continue;
			}

			if (expectedLines[i].trim() === actualLines[j].trim()) {
				displayExpected += `${GRAY}${leftPad(`${i+1}`, padLength)}${GREEN} ${expectedLines[i]}${CLEAR}\n`;
				displayActual += `${GRAY}${leftPad(`${j+1}`, padLength)}${GREEN} ${actualLines[j]}${CLEAR}\n`;
			} else {
				ok = false;
				displayExpected += `${GRAY}${leftPad(`${i+1}`, padLength)}${RED} ${expectedLines[i]}${CLEAR}\n`;
				displayActual += `${GRAY}${leftPad(`${j+1}`, padLength)}${RED} ${actualLines[j]}${CLEAR}\n`;
			}

			i++;
			j++;
		}

		while (i < expectedLines.length) {
			ok = false;
			displayExpected += `${GRAY}${leftPad(`${i+1}`, padLength)}${RED} ${expectedLines[i]}${CLEAR}\n`;
			i++;
		}

		while (j < actualLines.length) {
			ok = false;
			displayActual += `${GRAY}${leftPad(`${j+1}`, padLength)}${RED} ${actualLines[j]}${CLEAR}\n`;
			j++;
		}

		return Promise.resolve({
			ok,
			display: {
				expected: displayExpected,
				actual: displayActual
			}
		});
	}
} as { [key: string]: (inp: CheckerInput) => Promise<CheckerOutput> };