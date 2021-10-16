#!/bin/bash

ulimit -n 2046 # max file opened

ulimit -n

scriptdir=`dirname "$BASH_SOURCE"`

pushd $scriptdir

git pull

cd scraper

go run main.go

cd ..

git pull

git add -A

git commit -m 'update'

git push

npm run deploy