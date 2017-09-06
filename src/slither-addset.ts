import * as inquirer from "inquirer";
import * as fs from "fs";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[39m";
const BOLD = "\x1b[1m";
const CLEAR = "\x1b[0m";
const SNEK = "🐍";

const TEMPLATES: { [key: string]: any } = {
	"java": {
		limits: {
			timeout: 4000,
			memory: 64
		},
		scripts: {
			compile: "javac {name}.java",
			run: "java -Xmx512M -Xss64M -DONLINE_JUDGE=false -Duser.language=en -Duser.region=US -Duser.variant=US {name}",
			cleanup: "ls | grep -e '{name}.*\\.class' | xargs rm"
		}
	},
	"python": {
		limits: {
			timeout: 8000,
			memory: 64
		},
		scripts: {
			run: "python {name}.py"
		}
	},
	"js": {
		limits: {
			timeout: 2000,
			memory: 64
		},
		scripts: {
			run: "node {name}.js"
		}
	}
}

const questions: inquirer.Questions = [
	{
		type: "input",
		name: "name",
		message: "Name"
	},
	{
		type: "list",
		name: "template",
		message: "Template",
		choices: ["Java", "Python", "JS", "None"],
		filter: (val) => val.toLowerCase()
	},
	{
		type: "input",
		name: "limits.time",
		message: "Timeout",
		default: ({ template }: Answers) => template === "none" ? undefined : TEMPLATES[template].limits.timeout,
		filter: parseFloat
	},
	{
		type: "input",
		name: "limits.memory",
		message: "Memory Limit",
		default: ({ template }: Answers) => template === "none" ? undefined : TEMPLATES[template].limits.memory,
		filter: parseFloat
	},
	{
		type: "input",
		name: "io.input",
		message: "Input",
		default: "stdin"
	},
	{
		type: "input",
		name: "io.output",
		message: "Output",
		default: "stdout"
	},
	{
		type: "input",
		name: "scripts.compile",
		message: "Compile Command",
		default: ({ template }: Answers) => template === "none" ? undefined : TEMPLATES[template].scripts.compile,
	},
	{
		type: "input",
		name: "scripts.run",
		message: "Build Command",
		default: ({ template }: Answers) => template === "none" ? undefined : TEMPLATES[template].scripts.run,
	},
	{
		type: "input",
		name: "scripts.cleanup",
		message: "Cleanup Command",
		default: ({ template }: Answers) => template === "none" ? undefined : TEMPLATES[template].scripts.cleanup,
	},
	{
		type: "list",
		name: "checker",
		message: "Checker Options",
		choices: ["Exact Match" /*, "1e-3 Error", "1e-4 Error", "1e-6 Error" */],
		filter: (val) => {
			switch (val) {
				case "Exact Match": return { type: "lines" };
				case "1e-3 Error": return { type: "abs-rel", amount: 3 };
				case "1e-4 Error": return { type: "abs-rel", amount: 4 };
				case "1e-6 Error": return { type: "abs-rel", amount: 6 };
			}
		}
	},
	{
		type: "input",
		name: "debug",
		message: "Debug Output Delimeter",
		default: "#"
	}
] as inquirer.Questions; // ugh

interface Answers extends Testset {
	template: string;
}

fs.readFile(".slither/config.json", (err, data) => {
	if (err) {
		console.error(`${RED}No Slither configuration found in the current directory.  Run ${WHITE}${BOLD}slither init${RED} first.${CLEAR}`);
		return;
	}

	let config = JSON.parse(data.toString()) as Config;

	inquirer.prompt(questions)
		.then((answers: Answers) => {
			delete answers.template;
			let name = answers.name;
			delete answers.name;

			answers.io.input = answers.io.input.replace("{name}", name);
			answers.io.output = answers.io.output.replace("{name}", name);
			answers.scripts.compile = answers.scripts.compile.replace("{name}", name);
			answers.scripts.run = answers.scripts.run.replace("{name}", name);
			answers.scripts.cleanup = answers.scripts.cleanup.replace("{name}", name);

			if (name in config) {
				console.error(`${RED}A testset with the name ${name} already exists.${CLEAR}`);
				return;
			}

			config[name] = answers as Testset;

			fs.writeFile(".slither/config.json", JSON.stringify(config, null, "\t"), (err) => {
				if (err) {
					console.error(`${RED}File system error:`, err, `${CLEAR}`);
					return;
				}

				fs.mkdir(`.slither/${name}`, (err) => {
					if (err) {
						console.warn(`${YELLOW}File system error:`, err.message, `${CLEAR}`);
						console.warn(`${YELLOW}Continuing anyway...${CLEAR}`);
					}

					console.log(`${GREEN}Added test set ${name} to Slither.${CLEAR} ${SNEK}`);
				});
			});
		})
		.catch((err) => console.log(err));
});