# 🐍 slither

slither is a utility for testing simple IO-based programs.  It's perfect for algorithmic competitions like Codeforces or TopCoder, or for testing anything else where the only effects you care about are input and output.

## Installation

```
$ npm install -g slither
```

## Usage

```
# Wherever you want to use slither...
$ slither init

# Add a new testset
$ slither addset

# Add some tests to your testset
$ slither addtest [testset-name]

# Run the tests
$ slither test [testset-name]

# Helpful options:
#   -t, --tests [tests]   only run the specified tests
#   -i, --inspect         open the test inspector after testing
```