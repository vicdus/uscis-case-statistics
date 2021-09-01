#!/bin/bash

ulimit -n 2048 # max file opened

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