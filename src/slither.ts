import * as commander from "commander";
import * as fs from "fs";

commander
	.version("0.0.1")
	.command("init", "initialize slither in a directory")
	.command("addset", "add a new test set")
	// .command("addtest <set>", "add a new test case")
	.command("test <name>", "run a test set")
	.parse(process.argv);