#!/bin/bash

sed -i '/-LINECOUNT-/q' README.rd
cloc --read-lang-def=config/cloc_def.txt --exclude-dir=node_modules . >> README.rd
