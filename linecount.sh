#!/bin/bash

sed -i '/-LINECOUNT-/q' README.md
cloc --read-lang-def=config/cloc_def.txt --exclude-dir=node_modules . >> README.md
sed -i '/-LINECOUNT-/,+30 s/^/> /' README.md
